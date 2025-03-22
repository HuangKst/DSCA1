import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";

// 创建 DynamoDB 客户端
const client = DynamoDBDocumentClient.from(new DynamoDBClient());

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const body = event.body ? JSON.parse(event.body) : undefined;

    if (!body || !body.warehouse_id || !body.item_id) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Missing warehouse_id or item_id in request body" }),
      };
    }

    const updateExpression: string[] = [];
    const expressionAttributeValues: Record<string, any> = {};
    const expressionAttributeNames: Record<string, string> = {};

    for (const [key, value] of Object.entries(body)) {
      if (key !== "warehouse_id" && key !== "item_id") {
        updateExpression.push(`#${key} = :${key}`);
        expressionAttributeNames[`#${key}`] = key;
        expressionAttributeValues[`:${key}`] = value;
      }
    }

    if (updateExpression.length === 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "No updatable fields provided" }),
      };
    }

    const result = await client.send(
      new UpdateCommand({
        TableName: process.env.TABLE_NAME,
        Key: {
          warehouse_id: body.warehouse_id,
          item_id: body.item_id,
        },
        UpdateExpression: `SET ${updateExpression.join(", ")}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: "ALL_NEW",
      })
    );

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Item updated successfully", updatedItem: result.Attributes }),
    };
  } catch (error: any) {
    console.error("Update error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || "Internal Server Error" }),
    };
  }
};

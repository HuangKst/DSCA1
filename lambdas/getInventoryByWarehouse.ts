import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { applyTranslation } from "../shared/util";

const client = DynamoDBDocumentClient.from(new DynamoDBClient());

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const warehouseId = event.pathParameters?.warehouseId;
    const lang = event.queryStringParameters?.lang;

    if (!warehouseId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing warehouseId" }),
      };
    }

    if (!process.env.TABLE_NAME) {
      throw new Error("TABLE_NAME environment variable is not set");
    }

    const result = await client.send(
      new QueryCommand({
        TableName: process.env.TABLE_NAME,
        KeyConditionExpression: "warehouse_id = :wid",
        ExpressionAttributeValues: {
          ":wid": warehouseId,
        },
      })
    );

    const items = (result.Items || []).map((item) => applyTranslation(item, lang));

    return {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ items }),
    };
  } catch (error) {
    console.error("Error querying warehouse items:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal Server Error" }),
    };
  }
};

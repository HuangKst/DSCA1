import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { applyTranslation } from "../shared/util";

const client = DynamoDBDocumentClient.from(new DynamoDBClient());

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const warehouseId = event.pathParameters?.warehouseId;
    const itemId = event.pathParameters?.itemId;
    const lang = event.queryStringParameters?.lang;

    if (!warehouseId || !itemId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing path parameters" }),
      };
    }

    const result = await client.send(
      new GetCommand({
        TableName: process.env.TABLE_NAME,
        Key: {
          warehouse_id: warehouseId,
          item_id: itemId,
        },
      })
    );

    if (!result.Item) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: "Item not found" }),
      };
    }

    const item = applyTranslation(result.Item, lang);

    return {
      statusCode: 200,
      body: JSON.stringify({ item }),
    };
  } catch (error) {
    console.error("Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal Server Error" }),
    };
  }
};

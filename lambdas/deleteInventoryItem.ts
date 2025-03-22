import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, DeleteCommand } from "@aws-sdk/lib-dynamodb";

const client = DynamoDBDocumentClient.from(new DynamoDBClient());

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const warehouseId = event.pathParameters?.warehouseId;
    const itemId = event.pathParameters?.itemId;

    if (!warehouseId || !itemId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Missing warehouseId or itemId in path." }),
      };
    }

    await client.send(new DeleteCommand({
      TableName: process.env.TABLE_NAME,
      Key: {
        warehouse_id: warehouseId,
        item_id: itemId,
      },
    }));

    return {
      statusCode: 200,
      body: JSON.stringify({ message: `Item ${itemId} deleted from warehouse ${warehouseId}` }),
    };
  } catch (err: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};

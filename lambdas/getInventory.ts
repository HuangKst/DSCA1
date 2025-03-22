import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";


const client = DynamoDBDocumentClient.from(new DynamoDBClient());

export const handler: APIGatewayProxyHandlerV2 = async () => {
  try {
    console.log("Fetching inventory data...");
    
    if (!process.env.TABLE_NAME) {
      throw new Error("TABLE_NAME environment variable is not set");
    }

    const result = await client.send(new ScanCommand({ TableName: process.env.TABLE_NAME }));

    return {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ items: result.Items || [] }), 
    };
  } catch (error) {
    console.error("Error fetching inventory:", error);

    return {
      statusCode: 500,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ error: "Internal Server Error" }),
    };
  }
};

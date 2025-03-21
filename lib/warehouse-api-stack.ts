import * as cdk from "aws-cdk-lib";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import { Construct } from "constructs";

export class WarehouseAPIStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        // 创建 DynamoDB 表
        const warehouseTable = new dynamodb.Table(this, "WarehouseTable", {
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            partitionKey: { name: "warehouse_id", type: dynamodb.AttributeType.STRING },
            sortKey: { name: "item_id", type: dynamodb.AttributeType.STRING },
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            tableName: "WarehouseTable",
        });

        // 创建 API Gateway
        const api = new apigateway.RestApi(this, "WarehouseAPI", {
            description: "Warehouse Management API",
            deployOptions: { stageName: "dev" },
        });

    }
}

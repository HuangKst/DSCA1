import * as cdk from "aws-cdk-lib";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import { Construct } from "constructs";
import { inventoryData } from "../seed/inventory";
import * as custom from "aws-cdk-lib/custom-resources";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as lambdanode from "aws-cdk-lib/aws-lambda-nodejs";
import { generateBatch } from "../shared/util";

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
            defaultCorsPreflightOptions: {
                allowHeaders: ["Content-Type", "X-Amz-Date"],
                allowMethods: ["OPTIONS", "GET", "POST", "PUT", "PATCH", "DELETE"],
                allowCredentials: true,
                allowOrigins: ["*"],
            },
        });

        // 自动填充 DynamoDB 数据
        new custom.AwsCustomResource(this, "SeedInventoryData", {
            onCreate: {
                service: "DynamoDB",
                action: "batchWriteItem",
                parameters: {
                    RequestItems: {
                        [warehouseTable.tableName]: generateBatch(inventoryData) // ✅ 直接调用
                    },
                },
                physicalResourceId: custom.PhysicalResourceId.of("SeedInventoryData"),
            },
            policy: custom.AwsCustomResourcePolicy.fromSdkCalls({ resources: [warehouseTable.tableArn] }),
        });

        // 创建 API Key
        const apiKey = api.addApiKey("WarehouseApiKey", {
            apiKeyName: "warehouse-api-key",
            description: "API Key for creating inventory items",
        });

        // 创建使用计划并关联 Key
        const plan = api.addUsagePlan("WarehouseUsagePlan", {
            name: "WarehousePlan",
            throttle: {
                rateLimit: 10,
                burstLimit: 2,
            },
        });
        plan.addApiKey(apiKey);
        plan.addApiStage({
            stage: api.deploymentStage,
        });



        // Function 创建 Lambda 函数（查询库存）
        const getInventoryFn = new lambdanode.NodejsFunction(
            this, "GetInventoryFn", {
            architecture: lambda.Architecture.X86_64,
            runtime: lambda.Runtime.NODEJS_18_X,
            entry: `${__dirname}/../lambdas/getInventory.ts`,
            timeout: cdk.Duration.seconds(10),
            memorySize: 128,
            environment: {
                TABLE_NAME: warehouseTable.tableName,
                REGION: 'eu-west-1'
            },
            bundling: {
                forceDockerBundling: false,
            },

        });

        const getInventoryByWarehouseFn = new lambdanode.NodejsFunction(
            this,
            "GetInventoryByWarehouseFn",
            {
                runtime: lambda.Runtime.NODEJS_18_X,
                entry: `${__dirname}/../lambdas/getInventoryByWarehouse.ts`,
                handler: "handler",
                memorySize: 128,
                timeout: cdk.Duration.seconds(10),
                environment: {
                    TABLE_NAME: warehouseTable.tableName,
                },
                bundling: {
                    forceDockerBundling: false,
                },
            }
        );

        const getInventoryByItemFn = new lambdanode.NodejsFunction(this, "GetInventoryByItemFn", {
            runtime: lambda.Runtime.NODEJS_18_X,
            entry: `${__dirname}/../lambdas/getInventoryByItem.ts`,
            handler: "handler",
            environment: {
                TABLE_NAME: warehouseTable.tableName,
                REGION: "eu-west-1",
            },
            bundling: { forceDockerBundling: false },
        });

        const createInventoryItemFn = new lambdanode.NodejsFunction(this, "CreateInventoryItemFn", {
            runtime: lambda.Runtime.NODEJS_18_X,
            entry: `${__dirname}/../lambdas/createInventoryItem.ts`,
            handler: "handler",
            environment: {
                TABLE_NAME: warehouseTable.tableName,
                REGION: "eu-west-1",
            },
            bundling: {
                forceDockerBundling: false,
            },
        });

        const updateInventoryItemFn = new lambdanode.NodejsFunction(this, "UpdateInventoryItemFn", {
            runtime: lambda.Runtime.NODEJS_18_X,
            entry: `${__dirname}/../lambdas/updateInventoryItem.ts`,
            handler: "handler",
            environment: {
                TABLE_NAME: warehouseTable.tableName,
                REGION: "eu-west-1",
            },
            bundling: {
                forceDockerBundling: false,
            },
        });
        const deleteInventoryItemFn = new lambdanode.NodejsFunction(this, "DeleteInventoryItemFn", {
            runtime: lambda.Runtime.NODEJS_18_X,
            entry: `${__dirname}/../lambdas/deleteInventoryItem.ts`,
            handler: "handler",
            environment: {
              TABLE_NAME: warehouseTable.tableName,
            },
            bundling: { forceDockerBundling: false },
          });
          
          
          






        // 创建 API 端点
        //GET ALL inventory
        const inventoryEndpoint = api.root.addResource("inventory");
        inventoryEndpoint.addMethod(
            "GET",
            new apigateway.LambdaIntegration(getInventoryFn)
        );

        //Sort items by warehouse id 
        const inventoryByWarehouse = inventoryEndpoint.addResource("warehouse").addResource("{warehouseId}");
        inventoryByWarehouse.addMethod(
            "GET",
            new apigateway.LambdaIntegration(getInventoryByWarehouseFn)
        );

        //Select the item by item id and warehouse id 
        const inventoryByItem = inventoryByWarehouse.addResource("item").addResource("{itemId}");
        inventoryByItem.addMethod(
            "GET",
            new apigateway.LambdaIntegration(getInventoryByItemFn)
        );

        //Add item to warehouse 
        inventoryEndpoint.addMethod(
            "POST",
            new apigateway.LambdaIntegration(createInventoryItemFn),
            {
                apiKeyRequired: true,
            }
        );

        //Update the items
        inventoryEndpoint.addMethod(
            "PUT",
            new apigateway.LambdaIntegration(updateInventoryItemFn),
            {
                apiKeyRequired: true,
            }
        );
        //Delete item 
        inventoryByItem.addMethod(
            "DELETE",
            new apigateway.LambdaIntegration(deleteInventoryItemFn),
            {
                apiKeyRequired:true,
            }
          );
          

        // Permission
        warehouseTable.grantReadData(getInventoryFn);
        warehouseTable.grantReadData(getInventoryByWarehouseFn);
        warehouseTable.grantReadData(getInventoryByItemFn);
        warehouseTable.grantWriteData(createInventoryItemFn);
        warehouseTable.grantWriteData(updateInventoryItemFn);
        warehouseTable.grantWriteData(deleteInventoryItemFn);





    }
}

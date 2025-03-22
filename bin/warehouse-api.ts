#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { WarehouseAPIStack } from "../lib/warehouse-api-stack";

const app = new cdk.App();

new WarehouseAPIStack(app, "WarehouseAPIStack", {env: {region: "eu-west-1"} });

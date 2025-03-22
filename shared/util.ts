import { marshall } from "@aws-sdk/util-dynamodb";
import { InventoryItem } from "./types";

export const generateItem = (entity: InventoryItem) => {
  return {
    PutRequest: {
      Item: marshall(entity),
    },
  };
};

export const generateBatch = (data: InventoryItem[]) => {
  return data.map((e) => generateItem(e));
};

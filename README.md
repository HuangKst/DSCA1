## Serverless REST Assignment - Distributed Systems.

__Name:__ Zihan Huang

__Demo:__ YOUR YOUTUBE DEMO LINK HERE

---

### Context.

**Context**: Warehouse Inventory Management System

A RESTful API for managing inventory items across multiple warehouses, built with AWS CDK, Lambda, API Gateway, and DynamoDB.

**DynamoDB Table**: `WarehouseTable`

**Item Attributes**:

| Attribute        | Type    | Description                                      |
|------------------|---------|--------------------------------------------------|
| `warehouse_id`   | string  | Warehouse ID (Partition Key)                    |
| `item_id`        | string  | Item ID (Sort Key)                              |
| `name`           | string  | Item name                                       |
| `description`    | string  | Default description (in English)                |
| `quantity`       | number  | Quantity in stock                               |
| `in_stock`       | boolean | Whether the item is currently in stock          |
| `translations`   | object  | Translated descriptions (e.g., `zh`, `fr`)      |

---

### App API Endpoints

 All implemented with AWS Lambda & API Gateway

+ `POST /inventory`  
  ➤ Add a new inventory item (requires API Key)

+ `GET /inventory`  
  ➤ Get all inventory items  
  ➤ Supports `lang` query param for translations (e.g., `?lang=fr`)

+ `GET /inventory/warehouse/{warehouseId}`  
  ➤ Get all items for a specific warehouse

+ `GET /inventory/warehouse/{warehouseId}/item/{itemId}`  
  ➤ Get a single item by warehouse + item ID

+ `PUT /inventory`  
  ➤ Update an existing item (must include `warehouse_id` and `item_id`)

+ `DELETE /inventory/warehouse/{warehouseId}/item/{itemId}`  
  ➤ Delete an item by composite key

---

### Features

#### Translation Persistence

Each item stores its localized descriptions in a `translations` object.

📦 Example:
```json
{
  "item_id": "1",
  "warehouse_id": "WH001",
  "name": "Steel Rod",
  "description": "Strong steel rod for construction.",
  "translations": {
    "zh": "用于建筑的坚固钢棒",
    "fr": "Tige d'acier solide pour la construction."
  }
}

```

#### API Key Authentication

Only clients with a valid API key can create new inventory items.

📌 **CDK Snippet**:

```
ts复制编辑const apiKey = api.addApiKey("WarehouseApiKey", {
  apiKeyName: "warehouse-api-key",
});

const usagePlan = api.addUsagePlan("WarehousePlan", {
  name: "WarehousePlan",
});
usagePlan.addApiKey(apiKey);
usagePlan.addApiStage({ stage: api.deploymentStage });
```

🛡️ Use this header in Postman:

```
x-api-key: YOUR_API_KEY
```

------

#### ✅ JSON Schema Validation

🧪 Runtime validation of POST request bodies is handled via AJV, using schemas generated from TypeScript types.

 `shared/types.d.ts`

```
export interface InventoryItem {
  item_id: string;
  warehouse_id: string;
  name: string;
  description: string;
  quantity: number;
  in_stock: boolean;
  translations?: { [lang: string]: string };
}
```

 Generated schema:

```
npm install -D typescript-json-schema
```

 In `package.json`:

```
scripts": {
  "schema": "typescript-json-schema --noExtraProps --required --refs false -o ./shared/types.schema.json ./shared/types.d.ts *"
}
```

Run:

```
npm run schema
```

 AJV is used in Lambda:

```
import schema from "../shared/types.schema.json";

const ajv = new Ajv();
const validate = ajv.compile(schema.definitions["InventoryItem"] || {});
```

------

### Infrastructure

####  CDK-Based Infrastructure (IaC)

All resources are created using AWS CDK (`TypeScript`):

| Resource         | Type                        |
| ---------------- | --------------------------- |
| `WarehouseTable` | DynamoDB Table              |
| `RestApi`        | Amazon API Gateway REST API |
| `NodejsFunction` | AWS Lambda (via ESBuild)    |
| `CustomResource` | For seeding initial data    |
| `UsagePlan`      | API Gateway rate limiting   |

Deployment:

```
npm run schema     # Generate schema before deploy
cdk deploy
```

 Dev-only reset:

```
cdk destroy
```

------

### Project Structure

```
.
├── lib/
│   └── warehouse-api-stack.ts       # CDK stack
├── lambdas/
│   ├── getInventory.ts
│   ├── createInventoryItem.ts
│   ├── updateInventoryItem.ts
│   └── deleteInventoryItem.ts
├── shared/
│   ├── types.d.ts                   # TypeScript types
│   ├── types.schema.json            # Auto-generated schema (gitignored)
│   └── util.ts                      # Helper functions
├── seed/
│   └── inventory.ts                 # Initial data
├── package.json
├── tsconfig.json
└── README.md

```

------

### Extra

- ✅ Multi-language support (client-driven)
- ✅ JSON Schema validation using auto-generated schemas
- ✅ Rate limiting with API Gateway usage plans
- ✅ API secured via API Key
- ✅ Fully reproducible infrastructure with AWS CDK

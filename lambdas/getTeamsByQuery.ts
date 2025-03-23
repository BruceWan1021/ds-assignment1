import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand, ScanCommandInput } from "@aws-sdk/lib-dynamodb";
import Ajv from "ajv";
import schema from "../shared/types.schema.json";
import { TeamQueryParams } from "../shared/types";

const ajv = new Ajv();
const isValidQueryParams = ajv.compile(schema.definitions["TeamQueryParams"] || {});
const ddbDocClient = createDocumentClient();

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const queryParams = event.queryStringParameters as TeamQueryParams;

    if (!queryParams || Object.keys(queryParams).length === 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Missing query parameters" }),
      };
    }

    if (!isValidQueryParams(queryParams)) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: `Query parameters do not match schema`,
          errors: isValidQueryParams.errors,
        }),
      };
    }

    // Build FilterExpression
    const filterExpressions: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};

    for (const key of Object.keys(queryParams)) {
      const placeholderName = `#${key}`;
      const placeholderValue = `:${key}`;

      filterExpressions.push(`begins_with(${placeholderName}, ${placeholderValue})`);
      expressionAttributeNames[placeholderName] = key;
      expressionAttributeValues[placeholderValue] = queryParams[key];
    }

    const input: ScanCommandInput = {
      TableName: process.env.TABLE_NAME,
      FilterExpression: filterExpressions.join(" AND "),
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
    };

    const result = await ddbDocClient.send(new ScanCommand(input));

    return {
      statusCode: 200,
      body: JSON.stringify({ data: result.Items }),
    };
  } catch (err: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};

function createDocumentClient() {
  const client = new DynamoDBClient({ region: process.env.REGION });
  return DynamoDBDocumentClient.from(client, {
    marshallOptions: {
      convertEmptyValues: true,
      removeUndefinedValues: true,
    },
    unmarshallOptions: { wrapNumbers: false },
  });
}

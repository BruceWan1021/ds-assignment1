import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { TranslateClient, TranslateTextCommand } from "@aws-sdk/client-translate";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";

const REGION = process.env.REGION || "eu-west-1";
const TABLE_NAME = process.env.TABLE_NAME || "";

const ddbClient = new DynamoDBClient({ region: REGION });
const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);
const translateClient = new TranslateClient({ region: REGION });

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const teamId = event.pathParameters?.teamId;
    const playerId = event.pathParameters?.playerId;
    const languageCode = event.queryStringParameters?.languageCode || "zh";

    if (!teamId || !playerId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Missing teamId or playerId in path parameters." }),
      };
    }

    const { Item } = await ddbDocClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: { teamId, playerId },
      })
    );

    if (!Item) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "Team member not found." }),
      };
    }

    const fieldsToTranslate = ["name", "description"];
    const translated: Record<string, string> = {};
    const newTranslations: any[] = [];

    for (const field of fieldsToTranslate) {
        const existing = Item.translation?.find(
            (t: any) => t.languageCode === languageCode && t.field === field
        );

        if (existing) {
            translated[field] = existing.text;
          } else if (Item[field]) {
        const command = new TranslateTextCommand({
          SourceLanguageCode: "en",
          TargetLanguageCode: languageCode,
          Text: Item[field],
        });

        const { TranslatedText } = await translateClient.send(command);
        translated[field] = TranslatedText || "";
        newTranslations.push({
            languageCode,
            field,
            text: TranslatedText || "",
        });
      }
    }

    if (newTranslations.length > 0) {
        await ddbDocClient.send(
          new UpdateCommand({
            TableName: TABLE_NAME,
            Key: { teamId, playerId },
            UpdateExpression: "SET #t = list_append(if_not_exists(#t, :empty), :new)",
            ExpressionAttributeNames: {
              "#t": "translation",
            },
            ExpressionAttributeValues: {
              ":new": newTranslations,
              ":empty": [],
            },
          })
        );
      }
      
      return {
        statusCode: 200,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          teamId,
          playerId,
          translations: translated,
        }),
      };
  } catch (error: any) {
    console.error("[ERROR]", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};

## Serverless REST Assignment - Distributed Systems.

__Name:__ Zhenyang Wan

__Demo:__ https://youtu.be/FiESpAmaUcg

### Context.

State the context you chose for your web API and detail the attributes of the DynamoDB table items, e.g.

Context: Football Team Member Management

Table item attributes:
+ 
- teamId – string *(Partition Key)*
- playerId – string *(Sort Key)*
- name – string
- position – string
- isCaptain – boolean
- age – number
- description – string
- translation – list of objects with:
  - languageCode: string
  - field: string
  - text: string


### App API endpoints.

- `POST /teams` — Add a new team member *(protected by API key)*
- `GET /teams` — Get all team members
- `GET /teams/{teamId}/{playerId}` — Get specific team member by team and player ID
- `PUT /teams/{teamId}/{playerId}` — Update team member info *(protected by API key)*
- `GET /teams/search?teamId=...&position=...` — Query team members by arbitrary attributes (e.g., name or position)
- `GET /teams/{teamId}/{playerId}/translation?lang=...` — Translate specific fields and store in DynamoDB


### Features.

#### Translation persistence (if completed)

Each team member has a translation field, which is an array of translated entries. When a user requests a translation, the Lambda function checks if it already exists. If not, it translates will process and store the result in DynamoDB using an UpdateCommand.

- teamId – string *(Partition Key)*
- playerId – string *(Sort Key)*
- name – string
- position – string
- isCaptain – boolean
- age – number
- description – string
- translation – List<string>:
  - languageCode: string
  - field: string
  - text: string

#### Custom L2 Construct (if completed)

[State briefly the infrastructure provisioned by your custom L2 construct. Show the structure of its input props object and list the public properties it exposes, e.g. taken from the Cognito lab,

Construct Input props object:
~~~
type AuthApiProps = {
 userPoolId: string;
 userPoolClientId: string;
}
~~~
Construct public properties
~~~
export class MyConstruct extends Construct {
 public  PropertyName: type
 etc.
~~~
 ]

#### API Keys. (if completed)

Implemented API Key protection for POST and PUT endpoints. The CDK stack creates the API key and usage plan and associates them with these endpoints.

~~~ts
 const apiKey = api.addApiKey("TeamApiKey", {
          apiKeyName: "TeamManagementKey",
          description: "Required for POST and PUT methods"
        });

        const usagePlan = api.addUsagePlan("TimeApiUsagePlan", {
          name: "TEamAPIUsage",
          apiStages: [{ api, stage: api.deploymentStage}]
        });

        usagePlan.addApiKey(apiKey);

         teamsEndpoint.addMethod(
          "POST",
          new apig.LambdaIntegration(addTeamFn, { proxy: true }),
          { apiKeyRequired: true }
        );

        teamByIdEndpoint.addMethod(
          "PUT",
          new apig.LambdaIntegration(updateTeamMemberFn),
          { apiKeyRequired: true }
        );


~~~

###  Extra (If relevant).


Used AWS Translate SDK v3
Translations are cached and persisted on first lookup



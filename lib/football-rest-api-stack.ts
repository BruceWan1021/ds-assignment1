import * as cdk from "aws-cdk-lib";
import * as lambdanode from "aws-cdk-lib/aws-lambda-nodejs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as custom from "aws-cdk-lib/custom-resources";
import { Construct } from "constructs";
// import * as sqs from 'aws-cdk-lib/aws-sqs';
import { generateBatch } from "../shared/util";
import { teams } from "../seed/teams"
import * as apig from "aws-cdk-lib/aws-apigateway";
import * as iam from "aws-cdk-lib/aws-iam";

export class FootballRestApiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Tables 
    const teamsTable = new dynamodb.Table(this, "TeamsTable", {
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: "teamId", type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'playerId', type: dynamodb.AttributeType.STRING },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      tableName: "FootballTeams",
    });

    // Functions 
    const addTeamFn = new lambdanode.NodejsFunction(
      this,
      "AddTeamFunction",
      {
        architecture: lambda.Architecture.ARM_64,
        runtime: lambda.Runtime.NODEJS_18_X,
        entry: `${__dirname}/../lambdas/addTeams.ts`,
        timeout: cdk.Duration.seconds(10),
        memorySize: 128,
        environment: {
          TABLE_NAME: teamsTable.tableName,
          REGION: 'eu-west-1',
        },
      }
    );

    const getAllTeamsFn = new lambdanode.NodejsFunction(
      this,
      "GetAllTeamsFunction",
      {
        architecture: lambda.Architecture.ARM_64,
        runtime: lambda.Runtime.NODEJS_18_X,
        entry: `${__dirname}/../lambdas/getAllTeams.ts`,
        timeout: cdk.Duration.seconds(10),
        memorySize: 128,
        environment: {
          TABLE_NAME: teamsTable.tableName,
          REGION: 'eu-west-1',
        },
      }
    );

    const getTeamByIdFn = new lambdanode.NodejsFunction(
      this,
      "GetTeamByIdFunction",
      {
        architecture: lambda.Architecture.ARM_64,
        runtime: lambda.Runtime.NODEJS_18_X,
        entry: `${__dirname}/../lambdas/getTeamById.ts`,
        timeout: cdk.Duration.seconds(10),
        memorySize: 128,
        environment: {
          TABLE_NAME: teamsTable.tableName,
          REGION: 'eu-west-1',
        },
      }
    );

    const updateTeamMemberFn = new lambdanode.NodejsFunction(
      this,
      "UpdateTeamMemberFunction",
      {
        architecture: lambda.Architecture.ARM_64,
        runtime: lambda.Runtime.NODEJS_18_X,
        entry: `${__dirname}/../lambdas/updateTeamMember.ts`,
        timeout: cdk.Duration.seconds(10),
        memorySize: 128,
        environment: {
          TABLE_NAME: teamsTable.tableName,
          REGION: 'eu-west-1',
        },
      }
    );

    const getTeamsByQueryFn = new lambdanode.NodejsFunction(
      this,
      "GetTeamsByQueryFunction",
      {
        architecture: lambda.Architecture.ARM_64,
        runtime: lambda.Runtime.NODEJS_18_X,
        entry: `${__dirname}/../lambdas/getTeamsByQuery.ts`,
        timeout: cdk.Duration.seconds(10),
        memorySize: 128,
        environment: {
          TABLE_NAME: teamsTable.tableName,
          REGION: 'eu-west-1',
        },
      }
    );

        
      new custom.AwsCustomResource(this, "teamsddbInitData", {
        onCreate: {
          service: "DynamoDB",
          action: "batchWriteItem",
          parameters: {
            RequestItems: {
              [teamsTable.tableName]: generateBatch(teams),
            },
          },
          physicalResourceId: custom.PhysicalResourceId.of("teamsddbInitData"), 
        },
        policy: custom.AwsCustomResourcePolicy.fromSdkCalls({
          resources: [teamsTable.tableArn],  
        }),
      });
  

        
        // Permissions 
        teamsTable.grantWriteData(addTeamFn)
        teamsTable.grantReadData(getAllTeamsFn)
        teamsTable.grantReadData(getTeamByIdFn)
        teamsTable.grantReadWriteData(updateTeamMemberFn)
        teamsTable.grantReadData(getTeamsByQueryFn)

        const api = new apig.RestApi(this, "RestAPI", {
          description: "demo api",
          deployOptions: {
            stageName: "dev",
          },
          defaultCorsPreflightOptions: {
            allowHeaders: ["Content-Type", "X-Amz-Date"],
            allowMethods: [ "GET", "POST", "PUT" ],
            allowCredentials: true,
            allowOrigins: ["*"],
          },
        });
    
        const teamsEndpoint = api.root.addResource("teams");
        teamsEndpoint.addMethod(
          "POST",
          new apig.LambdaIntegration(addTeamFn, { proxy: true })
        );
        teamsEndpoint.addMethod(
          "GET",
          new apig.LambdaIntegration(getAllTeamsFn, { proxy: true })
        );

        const teamByIdEndpoint = teamsEndpoint.addResource("{teamId}").addResource("{playerId}")
        teamByIdEndpoint.addMethod(
          "GET",
          new apig.LambdaIntegration(getTeamByIdFn)
        );
        teamByIdEndpoint.addMethod(
          "PUT",
          new apig.LambdaIntegration(updateTeamMemberFn)
        );

        const queryEndpoint = teamsEndpoint.addResource("search")
        queryEndpoint.addMethod(
          "GET",
          new apig.LambdaIntegration(getTeamsByQueryFn)
        );
      }
    }
    


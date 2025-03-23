#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { FootballRestApiStack } from '../lib/football-rest-api-stack';

const app = new cdk.App();
new FootballRestApiStack(app, 'FootballRestApiStack', { env: {region: "eu-west-1"}
});
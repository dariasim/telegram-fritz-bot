#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { FritzBotStack } from '../lib/stack';

const app = new cdk.App();
new FritzBotStack(app, 'fritz-bot-stack', {});
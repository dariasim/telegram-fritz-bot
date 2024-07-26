import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as nodeLambda from 'aws-cdk-lib/aws-lambda-nodejs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigatewayv2';
import * as integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as iam from 'aws-cdk-lib/aws-iam';
import { SSMParameter } from '../../src/lib/ssm';

export class FritzBotStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create IAM Role
    const lambdaRole = new iam.Role(this, 'FritzBotLambdaRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      description: 'Role for Lambda to access SSM parameters',
    });

    // Attach basic execution role for Lambda
    lambdaRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'));

    // Attach SSM read-only policy
    const ssmParameterPrefix = 'arn:aws:ssm:eu-central-1:359330567557:parameter/'
    lambdaRole.addToPolicy(new iam.PolicyStatement({
      actions: ['ssm:GetParameter'],
      resources: [
        `${ssmParameterPrefix}${SSMParameter.FritzBotToken}`,
        `${ssmParameterPrefix}${SSMParameter.SpreadsheetId}`
      ],
    }));

    // Create API Gateway
    const apiGateway = new apigateway.HttpApi(this, 'FritzBotApi', {
      apiName: 'Fritz Bot',
      description: 'This service serves Fritz Bot',
    });

    // Create Lambda functions
    const fritzBotLambda = new nodeLambda.NodejsFunction(this, 'FritzBotLambda', {
      functionName: 'FritzBotLambda',
      architecture: lambda.Architecture.ARM_64,
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handler',
      memorySize: 1024,
      entry: 'src/lambda/fritz-bot.ts',
      loggingFormat: lambda.LoggingFormat.JSON,
      systemLogLevelV2: lambda.SystemLogLevel.WARN,
      logRetention: 7,
      role: lambdaRole,
      bundling: {
        target: 'node20',
        minify: false,
        sourceMap: false,
      },
    });

    // Create Lambda integrations
    const fritzBotLambdaIntegration = new integrations.HttpLambdaIntegration('FritzBotLambdaIntegration', fritzBotLambda);

    apiGateway.addRoutes({
      path: '/fritz-bot',
      methods: [apigateway.HttpMethod.POST],
      integration: fritzBotLambdaIntegration
    });

    // Create output for API Gateway URL
    new cdk.CfnOutput(this, 'FritzBotApiUrl', {
      value: apiGateway.url!,
      description: 'Fritz Bot API URL',
    });
  }
}

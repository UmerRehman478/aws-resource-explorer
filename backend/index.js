// index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { STSClient, AssumeRoleCommand } = require('@aws-sdk/client-sts');
const { EC2Client, DescribeInstancesCommand, DescribeVpcsCommand, DescribeSubnetsCommand, DescribeSecurityGroupsCommand } = require('@aws-sdk/client-ec2');
const { S3Client, ListBucketsCommand, GetBucketLocationCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const { LambdaClient, ListFunctionsCommand } = require('@aws-sdk/client-lambda');
const { IAMClient, ListUsersCommand, ListRolesCommand, ListAttachedUserPoliciesCommand } = require('@aws-sdk/client-iam');
const { DynamoDBClient, ListTablesCommand, DescribeTableCommand } = require('@aws-sdk/client-dynamodb');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

// This holds the temporary AWS credentials in memory, after someone assumes a role.
// Not meant for many users at once.
let currentCredentials = null;

// Quick test route, just to confirm the server is alive
app.get('/api/health', (req, res) => {
  res.json({ status: 'Server is running' });
});

// The main endpoint: takes a Role ARN, assumes it, stores temp credentials
app.post('/api/assume-role', async (req, res) => {
  const { roleArn } = req.body;

  if (!roleArn) {
    return res.status(400).json({ error: 'roleArn is required' });
  }

  try {
    const stsClient = new STSClient({ region: process.env.AWS_REGION });

    const command = new AssumeRoleCommand({
      RoleArn: roleArn,
      RoleSessionName: 'aws-explorer-session',
    });

    const response = await stsClient.send(command);

    // Save the temporary credentials so other endpoints can use them later
    currentCredentials = {
      accessKeyId: response.Credentials.AccessKeyId,
      secretAccessKey: response.Credentials.SecretAccessKey,
      sessionToken: response.Credentials.SessionToken,
    };

    res.json({ message: 'Role assumed successfully', expiration: response.Credentials.Expiration });
  } catch (err) {
    console.error('Error assuming role:', err);
    res.status(500).json({ error: err.message });
  }
});

// Lists EC2 instances using the temporary credentials from assume-role
app.get('/api/ec2/instances', async (req, res) => {
  if (!currentCredentials) {
    return res.status(400).json({ error: 'No role assumed yet. Call /api/assume-role first.' });
  }

  try {
    const ec2Client = new EC2Client({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: currentCredentials.accessKeyId,
        secretAccessKey: currentCredentials.secretAccessKey,
        sessionToken: currentCredentials.sessionToken,
      },
    });

    const command = new DescribeInstancesCommand({});
    const response = await ec2Client.send(command);

    // AWS groups instances inside "Reservations"
    const instances = [];
    response.Reservations.forEach((reservation) => {
      reservation.Instances.forEach((instance) => {
        instances.push({
          id: instance.InstanceId,
          state: instance.State.Name,
          type: instance.InstanceType,
          region: process.env.AWS_REGION,
        });
      });
    });

    res.json({ instances });
  } catch (err) {
    console.error('Error fetching EC2 instances:', err);
    res.status(500).json({ error: err.message });
  }
});

// Lists S3 buckets
app.get('/api/s3/buckets', async (req, res) => {
  if (!currentCredentials) {
    return res.status(400).json({ error: 'No role assumed yet. Call /api/assume-role first.' });
  }
  try {
    const s3Client = new S3Client({
      region: process.env.AWS_REGION,
      credentials: currentCredentials,
    });
    const response = await s3Client.send(new ListBucketsCommand({}));

    const buckets = await Promise.all(
      response.Buckets.map(async (b) => {
        let region = process.env.AWS_REGION;
        let sizeBytes = 0;

        try {
          const locationResponse = await s3Client.send(new GetBucketLocationCommand({ Bucket: b.Name }));
          region = locationResponse.LocationConstraint || 'us-east-1';
        } catch (e) {
          // If we can't get the region, just keep the default
        }

        try {
          const objectsResponse = await s3Client.send(new ListObjectsV2Command({ Bucket: b.Name }));
          if (objectsResponse.Contents) {
            sizeBytes = objectsResponse.Contents.reduce((total, obj) => total + (obj.Size || 0), 0);
          }
        } catch (e) {
          // If we can't list objects, just leave size as 0
        }

        return {
          name: b.Name,
          creationDate: b.CreationDate,
          region,
          sizeReadable: `${(sizeBytes / 1024).toFixed(2)} KB`,
        };
      })
    );

    res.json({ buckets });
  } catch (err) {
    console.error('Error fetching S3 buckets:', err);
    res.status(500).json({ error: err.message });
  }
});

// Lists Lambda functions
app.get('/api/lambda/functions', async (req, res) => {
  if (!currentCredentials) {
    return res.status(400).json({ error: 'No role assumed yet. Call /api/assume-role first.' });
  }
  try {
    const lambdaClient = new LambdaClient({
      region: process.env.AWS_REGION,
      credentials: currentCredentials,
    });
    const response = await lambdaClient.send(new ListFunctionsCommand({}));
    const functions = response.Functions.map((f) => ({
      name: f.FunctionName,
      runtime: f.Runtime,
      memory: f.MemorySize,
      lastModified: f.LastModified,
    }));
    res.json({ functions });
  } catch (err) {
    console.error('Error fetching Lambda functions:', err);
    res.status(500).json({ error: err.message });
  }
});

// Lists IAM users and roles
app.get('/api/iam/users', async (req, res) => {
  if (!currentCredentials) {
    return res.status(400).json({ error: 'No role assumed yet. Call /api/assume-role first.' });
  }
  try {
    const iamClient = new IAMClient({
      region: process.env.AWS_REGION,
      credentials: currentCredentials,
    });
    const usersResponse = await iamClient.send(new ListUsersCommand({}));
    const rolesResponse = await iamClient.send(new ListRolesCommand({}));

    const users = usersResponse.Users.map((u) => ({
      name: u.UserName,
      createdDate: u.CreateDate,
    }));
    const roles = rolesResponse.Roles.map((r) => ({
      name: r.RoleName,
      createdDate: r.CreateDate,
    }));

    const policies = [];
    for (const user of usersResponse.Users) {
      const attachedPolicies = await iamClient.send(
        new ListAttachedUserPoliciesCommand({ UserName: user.UserName })
      );
      attachedPolicies.AttachedPolicies.forEach((policy) => {
        policies.push({
          policyName: policy.PolicyName,
          attachedToUser: user.UserName,
        });
      });
    }

    res.json({ users, roles, policies });
  } catch (err) {
    console.error('Error fetching IAM data:', err);
    res.status(500).json({ error: err.message });
  }
});

// Lists VPCs and subnets
app.get('/api/vpc/list', async (req, res) => {
  if (!currentCredentials) {
    return res.status(400).json({ error: 'No role assumed yet. Call /api/assume-role first.' });
  }
  try {
    const ec2Client = new EC2Client({
      region: process.env.AWS_REGION,
      credentials: currentCredentials,
    });
    const vpcsResponse = await ec2Client.send(new DescribeVpcsCommand({}));
    const subnetsResponse = await ec2Client.send(new DescribeSubnetsCommand({}));
    const sgResponse = await ec2Client.send(new DescribeSecurityGroupsCommand({}));

    const vpcs = vpcsResponse.Vpcs.map((v) => ({
      id: v.VpcId,
      cidrBlock: v.CidrBlock,
      isDefault: v.IsDefault,
    }));
    const subnets = subnetsResponse.Subnets.map((s) => ({
      id: s.SubnetId,
      vpcId: s.VpcId,
      cidrBlock: s.CidrBlock,
      availabilityZone: s.AvailabilityZone,
    }));
    const securityGroups = sgResponse.SecurityGroups.map((sg) => ({
      id: sg.GroupId,
      name: sg.GroupName,
      vpcId: sg.VpcId,
      description: sg.Description,
    }));

    res.json({ vpcs, subnets, securityGroups });
  } catch (err) {
    console.error('Error fetching VPC data:', err);
    res.status(500).json({ error: err.message });
  }
});

// Lists DynamoDB tables and their details
app.get('/api/dynamodb/tables', async (req, res) => {
  if (!currentCredentials) {
    return res.status(400).json({ error: 'No role assumed yet. Call /api/assume-role first.' });
  }
  try {
    const dynamoClient = new DynamoDBClient({
      region: process.env.AWS_REGION,
      credentials: currentCredentials,
    });
    const listResponse = await dynamoClient.send(new ListTablesCommand({}));

    const tables = await Promise.all(
      listResponse.TableNames.map(async (tableName) => {
        const detail = await dynamoClient.send(new DescribeTableCommand({ TableName: tableName }));
        return {
          name: detail.Table.TableName,
          status: detail.Table.TableStatus,
          itemCount: detail.Table.ItemCount,
          region: process.env.AWS_REGION,
        };
      })
    );

    res.json({ tables });
  } catch (err) {
    console.error('Error fetching DynamoDB tables:', err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
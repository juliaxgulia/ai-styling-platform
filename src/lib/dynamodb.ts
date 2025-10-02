import { 
  PutItemCommand, 
  GetItemCommand, 
  UpdateItemCommand,
  QueryCommand,
  ScanCommand
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { dynamoClient, DYNAMODB_TABLE_NAME } from './aws-config';
import { UserProfile, OnboardingSession, AnalysisResults } from '@/types/user';

// DynamoDB Helper Functions
export class DynamoDBService {
  private tableName = DYNAMODB_TABLE_NAME;

  // User Profile Operations
  async createUserProfile(profile: UserProfile): Promise<void> {
    const command = new PutItemCommand({
      TableName: this.tableName,
      Item: marshall(profile),
    });
    await dynamoClient.send(command);
  }

  async getUserProfile(userId: string): Promise<UserProfile | null> {
    const command = new GetItemCommand({
      TableName: this.tableName,
      Key: marshall({
        PK: `USER#${userId}`,
        SK: 'PROFILE',
      }),
    });
    
    const result = await dynamoClient.send(command);
    return result.Item ? unmarshall(result.Item) as UserProfile : null;
  }

  async updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<void> {
    const updateExpression: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, unknown> = {};

    Object.entries(updates).forEach(([key, value], index) => {
      if (key !== 'PK' && key !== 'SK') {
        const attrName = `#attr${index}`;
        const attrValue = `:val${index}`;
        updateExpression.push(`${attrName} = ${attrValue}`);
        expressionAttributeNames[attrName] = key;
        expressionAttributeValues[attrValue] = value;
      }
    });

    const command = new UpdateItemCommand({
      TableName: this.tableName,
      Key: marshall({
        PK: `USER#${userId}`,
        SK: 'PROFILE',
      }),
      UpdateExpression: `SET ${updateExpression.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: marshall(expressionAttributeValues),
    });

    await dynamoClient.send(command);
  }

  // Onboarding Session Operations
  async createOnboardingSession(session: OnboardingSession): Promise<void> {
    const command = new PutItemCommand({
      TableName: this.tableName,
      Item: marshall(session),
    });
    await dynamoClient.send(command);
  }

  async getOnboardingSession(userId: string, sessionId: string): Promise<OnboardingSession | null> {
    const command = new GetItemCommand({
      TableName: this.tableName,
      Key: marshall({
        PK: `USER#${userId}`,
        SK: `ONBOARDING#${sessionId}`,
      }),
    });
    
    const result = await dynamoClient.send(command);
    return result.Item ? unmarshall(result.Item) as OnboardingSession : null;
  }

  async updateOnboardingSession(userId: string, sessionId: string, updates: Partial<OnboardingSession>): Promise<void> {
    const updateExpression: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, unknown> = {};

    Object.entries(updates).forEach(([key, value], index) => {
      if (key !== 'PK' && key !== 'SK') {
        const attrName = `#attr${index}`;
        const attrValue = `:val${index}`;
        updateExpression.push(`${attrName} = ${attrValue}`);
        expressionAttributeNames[attrName] = key;
        expressionAttributeValues[attrValue] = value;
      }
    });

    const command = new UpdateItemCommand({
      TableName: this.tableName,
      Key: marshall({
        PK: `USER#${userId}`,
        SK: `ONBOARDING#${sessionId}`,
      }),
      UpdateExpression: `SET ${updateExpression.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: marshall(expressionAttributeValues),
    });

    await dynamoClient.send(command);
  }

  // Generic put item operation
  async putItem(item: Record<string, any>): Promise<void> {
    const command = new PutItemCommand({
      TableName: this.tableName,
      Item: marshall(item),
    });
    await dynamoClient.send(command);
  }

  // Analysis Results Operations
  async createAnalysisResult(analysis: AnalysisResults): Promise<void> {
    const command = new PutItemCommand({
      TableName: this.tableName,
      Item: marshall(analysis),
    });
    await dynamoClient.send(command);
  }

  async getAnalysisResult(userId: string, analysisId: string): Promise<AnalysisResults | null> {
    const command = new GetItemCommand({
      TableName: this.tableName,
      Key: marshall({
        PK: `USER#${userId}`,
        SK: `ANALYSIS#${analysisId}`,
      }),
    });
    
    const result = await dynamoClient.send(command);
    return result.Item ? unmarshall(result.Item) as AnalysisResults : null;
  }

  async getUserAnalysisResults(userId: string): Promise<AnalysisResults[]> {
    const command = new QueryCommand({
      TableName: this.tableName,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: marshall({
        ':pk': `USER#${userId}`,
        ':sk': 'ANALYSIS#',
      }),
    });

    const result = await dynamoClient.send(command);
    return result.Items ? result.Items.map(item => unmarshall(item) as AnalysisResults) : [];
  }

  // User Authentication Operations
  async createUserAuth(userId: string, hashedPassword: string): Promise<void> {
    const command = new PutItemCommand({
      TableName: this.tableName,
      Item: marshall({
        PK: `USER#${userId}`,
        SK: 'AUTH',
        hashedPassword,
        createdAt: new Date().toISOString(),
      }),
    });
    await dynamoClient.send(command);
  }

  async getUserAuth(userId: string): Promise<{ hashedPassword: string } | null> {
    const command = new GetItemCommand({
      TableName: this.tableName,
      Key: marshall({
        PK: `USER#${userId}`,
        SK: 'AUTH',
      }),
    });
    
    const result = await dynamoClient.send(command);
    return result.Item ? { hashedPassword: unmarshall(result.Item).hashedPassword } : null;
  }

  async getUserByEmail(email: string): Promise<{ userId: string; hashedPassword: string } | null> {
    // Note: In a production app, you'd want a GSI on email for efficient lookup
    // For MVP, we'll use a simple approach - scan for profiles with matching email
    const command = new ScanCommand({
      TableName: this.tableName,
      FilterExpression: 'email = :email AND SK = :sk',
      ExpressionAttributeValues: marshall({
        ':email': email,
        ':sk': 'PROFILE',
      }),
    });

    try {
      const result = await dynamoClient.send(command);
      if (result.Items && result.Items.length > 0) {
        const item = unmarshall(result.Items[0]);
        const userId = item.PK.replace('USER#', '');
        
        // Get the auth record
        const authRecord = await this.getUserAuth(userId);
        if (authRecord) {
          return {
            userId,
            hashedPassword: authRecord.hashedPassword
          };
        }
      }
    } catch (error) {
      console.error('Error finding user by email:', error);
      return null;
    }

    return null;
  }
}

export const dynamoService = new DynamoDBService();
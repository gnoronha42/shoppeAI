
Object.defineProperty(exports, "__esModule", { value: true });

const {
  Decimal,
  objectEnumValues,
  makeStrictEnum,
  Public,
  getRuntime,
  skip
} = require('./runtime/index-browser.js')


const Prisma = {}

exports.Prisma = Prisma
exports.$Enums = {}

/**
 * Prisma Client JS version: 6.6.0
 * Query Engine version: f676762280b54cd07c770017ed3711ddde35f37a
 */
Prisma.prismaVersion = {
  client: "6.6.0",
  engine: "f676762280b54cd07c770017ed3711ddde35f37a"
}

Prisma.PrismaClientKnownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientKnownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)};
Prisma.PrismaClientUnknownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientUnknownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientRustPanicError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientRustPanicError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientInitializationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientInitializationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientValidationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientValidationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`sqltag is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.empty = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`empty is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.join = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`join is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.raw = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`raw is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.getExtensionContext is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.defineExtension = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.defineExtension is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}

/**
 * Shorthand utilities for JSON filtering
 */
Prisma.DbNull = objectEnumValues.instances.DbNull
Prisma.JsonNull = objectEnumValues.instances.JsonNull
Prisma.AnyNull = objectEnumValues.instances.AnyNull

Prisma.NullTypes = {
  DbNull: objectEnumValues.classes.DbNull,
  JsonNull: objectEnumValues.classes.JsonNull,
  AnyNull: objectEnumValues.classes.AnyNull
}



/**
 * Enums
 */

exports.Prisma.TransactionIsolationLevel = makeStrictEnum({
  ReadUncommitted: 'ReadUncommitted',
  ReadCommitted: 'ReadCommitted',
  RepeatableRead: 'RepeatableRead',
  Serializable: 'Serializable'
});

exports.Prisma.Activity_logScalarFieldEnum = {
  id: 'id',
  user_id: 'user_id',
  client_id: 'client_id',
  action: 'action',
  entity_type: 'entity_type',
  entity_id: 'entity_id',
  details: 'details',
  created_at: 'created_at'
};

exports.Prisma.Ad_metricsScalarFieldEnum = {
  id: 'id',
  client_id: 'client_id',
  product_id: 'product_id',
  ad_type: 'ad_type',
  impressions: 'impressions',
  clicks: 'clicks',
  ctr: 'ctr',
  spend: 'spend',
  conversions: 'conversions',
  roas: 'roas',
  date: 'date',
  created_at: 'created_at'
};

exports.Prisma.Ai_requestsScalarFieldEnum = {
  id: 'id',
  user_id: 'user_id',
  client_id: 'client_id',
  prompt: 'prompt',
  response: 'response',
  model: 'model',
  tokens_used: 'tokens_used',
  processing_time: 'processing_time',
  created_at: 'created_at'
};

exports.Prisma.AnalysesScalarFieldEnum = {
  id: 'id',
  client_id: 'client_id',
  type: 'type',
  title: 'title',
  created_at: 'created_at'
};

exports.Prisma.Analysis_resultsScalarFieldEnum = {
  id: 'id',
  analysis_id: 'analysis_id',
  content: 'content',
  source_image_url: 'source_image_url',
  processed_by: 'processed_by',
  created_at: 'created_at'
};

exports.Prisma.Chat_conversationsScalarFieldEnum = {
  id: 'id',
  user_id: 'user_id',
  client_id: 'client_id',
  title: 'title',
  created_at: 'created_at',
  updated_at: 'updated_at'
};

exports.Prisma.Chat_messagesScalarFieldEnum = {
  id: 'id',
  user_id: 'user_id',
  client_id: 'client_id',
  conversation_id: 'conversation_id',
  content: 'content',
  is_ai_response: 'is_ai_response',
  created_at: 'created_at'
};

exports.Prisma.ClientsScalarFieldEnum = {
  id: 'id',
  name: 'name',
  owner_name: 'owner_name',
  shop_url: 'shop_url',
  followers: 'followers',
  rating: 'rating',
  registration_date: 'registration_date',
  product_count: 'product_count',
  response_rate: 'response_rate',
  created_at: 'created_at',
  updated_at: 'updated_at'
};

exports.Prisma.ConfigurationsScalarFieldEnum = {
  id: 'id',
  user_id: 'user_id',
  key: 'key',
  value: 'value',
  is_global: 'is_global',
  created_at: 'created_at',
  updated_at: 'updated_at'
};

exports.Prisma.ImagesScalarFieldEnum = {
  id: 'id',
  analysis_id: 'analysis_id',
  report_id: 'report_id',
  url: 'url',
  original_filename: 'original_filename',
  file_size: 'file_size',
  mime_type: 'mime_type',
  created_at: 'created_at'
};

exports.Prisma.ProductsScalarFieldEnum = {
  id: 'id',
  client_id: 'client_id',
  product_id: 'product_id',
  name: 'name',
  price: 'price',
  original_price: 'original_price',
  stock: 'stock',
  views: 'views',
  sales: 'sales',
  conversion_rate: 'conversion_rate',
  category: 'category',
  created_at: 'created_at',
  updated_at: 'updated_at'
};

exports.Prisma.Report_metricsScalarFieldEnum = {
  id: 'id',
  report_id: 'report_id',
  metric_name: 'metric_name',
  metric_value: 'metric_value',
  previous_value: 'previous_value',
  change_percentage: 'change_percentage',
  created_at: 'created_at'
};

exports.Prisma.ReportsScalarFieldEnum = {
  id: 'id',
  client_id: 'client_id',
  analysis_id: 'analysis_id',
  type: 'type',
  title: 'title',
  url: 'url',
  status: 'status',
  created_at: 'created_at'
};

exports.Prisma.UsersScalarFieldEnum = {
  id: 'id',
  name: 'name',
  email: 'email',
  password: 'password',
  role: 'role',
  created_at: 'created_at',
  updated_at: 'updated_at'
};

exports.Prisma.SortOrder = {
  asc: 'asc',
  desc: 'desc'
};

exports.Prisma.NullableJsonNullValueInput = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull
};

exports.Prisma.QueryMode = {
  default: 'default',
  insensitive: 'insensitive'
};

exports.Prisma.JsonNullValueFilter = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull,
  AnyNull: Prisma.AnyNull
};

exports.Prisma.NullsOrder = {
  first: 'first',
  last: 'last'
};


exports.Prisma.ModelName = {
  activity_log: 'activity_log',
  ad_metrics: 'ad_metrics',
  ai_requests: 'ai_requests',
  analyses: 'analyses',
  analysis_results: 'analysis_results',
  chat_conversations: 'chat_conversations',
  chat_messages: 'chat_messages',
  clients: 'clients',
  configurations: 'configurations',
  images: 'images',
  products: 'products',
  report_metrics: 'report_metrics',
  reports: 'reports',
  users: 'users'
};

/**
 * This is a stub Prisma Client that will error at runtime if called.
 */
class PrismaClient {
  constructor() {
    return new Proxy(this, {
      get(target, prop) {
        let message
        const runtime = getRuntime()
        if (runtime.isEdge) {
          message = `PrismaClient is not configured to run in ${runtime.prettyName}. In order to run Prisma Client on edge runtime, either:
- Use Prisma Accelerate: https://pris.ly/d/accelerate
- Use Driver Adapters: https://pris.ly/d/driver-adapters
`;
        } else {
          message = 'PrismaClient is unable to run in this browser environment, or has been bundled for the browser (running in `' + runtime.prettyName + '`).'
        }

        message += `
If this is unexpected, please open an issue: https://pris.ly/prisma-prisma-bug-report`

        throw new Error(message)
      }
    })
  }
}

exports.PrismaClient = PrismaClient

Object.assign(exports, Prisma)

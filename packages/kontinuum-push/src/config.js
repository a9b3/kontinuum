const config = {
  accessKeyId    : process.env.AWS_ACCESS_KEY_ID || '',
  region         : process.env.AWS_DEFAULT_REGION || 'us-west-2',
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
}

export default config

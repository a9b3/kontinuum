import {
  Commander,
  Command,
}                from 'commander-shepard'

import push      from 'bin/commands/push'
import delcerts  from 'bin/commands/delcerts'

const commander = new Commander({
  key            : 'kontinuum-push',
  packageJson    : require('../../package.json'),
  longDescription: 'Help manage your platform.',
})

commander.use('push', new Command({
  key             : 'push',
  longDescription : 'Deploy a static website. Runs a series of aws commands.',
  shortDescription: 'Deploy a static website. Runs a series of aws commands.',
  handler         : async ({flags}) => {
    await push(flags)
  },
  flags: [
    {
      required        : true,
      keys            : ['domain'],
      shortDescription: 'The domain you want to deploy to.',
    },
    {
      required        : true,
      keys            : ['source'],
      shortDescription: 'The path to the directory file to upload.',
    },
  ],
}))

commander.use('delcerts', new Command({
  key             : 'delcerts',
  shortDescription: 'Select certificates to delete.',
  handler         : async ({flags}) => {
    await delcerts(flags)
  },
}))

export default commander

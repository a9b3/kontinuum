import configure from './configure'
import * as acm  from './acm'

async function push({
  domain,
} = {}) {
  configure()
}

export default push

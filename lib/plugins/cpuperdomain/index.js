'use strict';

const path = require('path'),
  log = require('intel').getLogger('plugins.CPUPERDOMAIN'),
  zlib = require('zlib'),
  HttpGet = require('http').get,
  cpuUsage = require('3rd-party-cpu-abuser')

const timelineFileName = 'cpu-timeline.json'

module.exports = {
  name() {
    return path.basename(__dirname);
  },
  open(context, options) {
    this.storageManager = context.storageManager;
    console.log(context, options)
    // if WPT is configured, require the timeline
    if('webpagetest' in options){
      // TODO : verify forcing the option of another plugin works …
      options.webpagetest.timeline = true
    }
    // TODO detect if browsertime.chrome, then require its timeline
    // console.log(options.webpagetest)
  },
  processMessage(message, queue) {
    // console.log('processMessage', message)

    /*if(message.type === 'webpagetest.pageSummary'){
      // should already contain the host
      timelineWPTurl += '/getTimeline.php?test=' + message.data.data.id
      console.log(timelineWPTurl)
    } else 
    */if(message.type === 'webpagetest.run') {
      // will return something like http://WPT-SERVER/getgzip.php?test=TEST_ID&compressed=1&file=1_trace.json.gz
      console.log('WEBPAGETEST GET CPU URL', message.data.firstView.rawData.trace)

      return getUrlAndUnzip(message.data.firstView.rawData.trace)
        // write the unziped JSON the disk
        .then(data => this.storageManager.writeDataForUrl(data,
            timelineFileName, message.url)
        )
        // run an analysis
        .then( _ => {
          const file = path.resolve(
            this.storageManager.getDirForUrl(message.url, 'data'),
            timelineFileName
          )
          console.log( 
            cpuUsage.data({
              file
            })
          )
        })
    }

  }
}

function getUrlAndUnzip(url) {
  return new Promise( (resolve, reject) => {
    // get and unzip the WPT file
    HttpGet(url, res => {
      const gunzip = zlib.createGunzip()
      res.pipe(gunzip)
      const buffer = []

      gunzip
        .on('data', chunk => buffer.push(chunk.toString()) )
        .on('end', () => resolve(buffer.join('')) )
        .on('error', e => reject(new Error(e)) )
    })
  })
}

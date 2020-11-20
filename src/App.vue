<template>
  <v-app>
    <v-app-bar
      :value="!isFullscreen"
      dense
      app
      color="primary"
      dark
      :class="{ 'oeos-fullscreen': isFullscreen }"
    >
      <div class="d-flex">
        <div v-if="title" class="oeos-title">
          <b>{{ title }}</b>
          <span> by {{ author }}</span>
        </div>
        <div v-else class="oeos-title">
          <svg
            fill="none"
            height="24"
            stroke="currentColor"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            width="24"
          >
            <path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z" />
            <path d="M16 8L2 22" />
            <path d="M17 15H9" />
          </svg>
          <b>Open EOS Player</b>
          <span>v{{ version }}</span>
        </div>
      </div>

      <v-spacer></v-spacer>

      <v-btn v-if="script" icon @click.stop="downloadDialog = true">
        <v-icon>mdi-download</v-icon>
      </v-btn>
      <v-btn icon @click="toggleFullscreen">
        <v-icon>mdi-fullscreen</v-icon>
      </v-btn>
    </v-app-bar>

    <v-main ref="mainPlayer">
      <open-eos-player
        v-if="script"
        :script="script"
        :is-fullscreen="this.isFullscreen"
      />
      <v-container v-else>
        <v-text-field
          label="Milovana Tease URL"
          v-model="teaseUrl"
          prepend-icon="mdi-link-variant"
          :error-messages="errors"
          :loading="loading"
          @keydown.enter="loadMilovanaUrl"
          @input="
            () => {
              this.error = null
            }
          "
        />
        <v-btn @click="loadMilovanaUrl" :loading="loading"
          >Load Tease From URL</v-btn
        >
        <v-file-input
          v-model="fileUpload"
          prepend-icon="mdi-cloud-upload"
          accept="application/json, text/json"
          label="Upload Json"
          :error-messages="fileErrors"
          @change="fileError = null"
        ></v-file-input>
        <v-btn @click="uploadFile" :loading="loading"
          >Load Tease From JSON</v-btn
        >
      </v-container>
    </v-main>
    <v-dialog v-model="downloadDialog" max-width="290">
      <v-card>
        <v-card-title class="headline">
          Download Tease
        </v-card-title>

        <v-card-text>
          This will attempt to download <i>{{ displayTitle }}</i> for offline
          use. This operation could crash your browser if you don't have enough
          ram.
        </v-card-text>

        <v-card-actions>
          <v-spacer></v-spacer>

          <v-btn color="green darken-1" text @click="downloadDialog = false">
            No thanks
          </v-btn>

          <v-btn color="green darken-1" text @click="startDownload">
            Do it!
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <v-dialog v-model="message.show" max-width="290">
      <v-card>
        <v-card-title class="headline">
          {{ message.title }}
        </v-card-title>

        <v-card-text v-html="message.html"> </v-card-text>

        <v-card-actions>
          <v-spacer></v-spacer>

          <v-btn
            v-if="message.onCancel"
            color="green darken-1"
            text
            @click="
              message.onCancel()
              closeMessage()
            "
          >
            Nope
          </v-btn>
          <v-btn
            color="green darken-1"
            text
            @click="
              message.onContinue()
              closeMessage()
            "
          >
            Okay
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <v-dialog v-model="downloading" hide-overlay persistent width="300">
      <v-card color="primary" dark>
        <v-card-text>
          Downloading ({{ downloadedDisplay }})
          <v-progress-linear
            indeterminate
            color="white"
            class="mb-0"
          ></v-progress-linear>
        </v-card-text>
      </v-card>
    </v-dialog>
  </v-app>
</template>

<script>
import OpenEosPlayer from './components/OpenEosPlayer'
import { version } from '../package.json'
import { buildHref } from './util'
import prettysize from 'prettysize'

const CORS_PROXY = 'https://ancient-everglades-64876.herokuapp.com/'

const parser = new DOMParser()

function downloadObjectAsJson(exportObj, exportName) {
  var dataStr =
    'data:text/json;charset=utf-8,' +
    encodeURIComponent(JSON.stringify(exportObj))
  var downloadAnchorNode = document.createElement('a')
  downloadAnchorNode.setAttribute('href', dataStr)
  downloadAnchorNode.setAttribute('download', exportName + '.json')
  document.body.appendChild(downloadAnchorNode) // required for firefox
  downloadAnchorNode.click()
  downloadAnchorNode.remove()
}

function convertToValidFilename(string) {
  return string.replace(/[/|\\:*?"<>]/g, ' ')
}

function readBlob(b) {
  return new Promise(function(resolve, reject) {
    const reader = new FileReader()

    reader.onloadend = function() {
      resolve(reader.result)
    }

    // TODO: hook up reject to reader.onerror somehow and try it

    reader.readAsDataURL(b)
  })
}

async function downloadEosFile(file, smaller) {
  const url = buildHref(file, smaller)
  const response = await fetch(CORS_PROXY + url)
  const blob = await response.blob()
  const content = await readBlob(blob)
  file.href = content
  return (content && content.length) || 0
}

export default {
  name: 'App',

  components: {
    OpenEosPlayer,
  },
  computed: {
    downloadedDisplay() {
      return prettysize(this.downloaded)
    },
    errors() {
      return this.error ? [this.error] : []
    },
    fileErrors() {
      return this.fileError ? [this.fileError] : []
    },
    displayTitle() {
      return this.title ? this.title : 'this tease'
    },
  },
  data: () => ({
    isFullscreen: false,
    script: null,
    eosuri: null,
    error: null,
    fileError: null,
    title: null,
    author: null,
    authorId: null,
    teaseId: null,
    teaseKey: null,
    teaseUrl: null,
    loading: false,
    version: version,
    downloadDialog: false,
    downloading: false,
    fileUpload: null,
    downloaded: 0,
    message: {
      title: null,
      html: null,
      show: false,
    },
  }),
  mounted() {
    const t = this
    function exitHandler(e) {
      if (
        document.webkitIsFullScreen ||
        document.mozFullScreen ||
        document.msFullscreenElement
      ) {
        requestAnimationFrame(() => (t.isFullscreen = true))
      } else {
        requestAnimationFrame(() => (t.isFullscreen = false))
      }
    }
    if (document.addEventListener) {
      document.addEventListener('fullscreenchange', exitHandler, false)
      document.addEventListener('mozfullscreenchange', exitHandler, false)
      document.addEventListener('MSFullscreenChange', exitHandler, false)
      document.addEventListener('webkitfullscreenchange', exitHandler, false)
    }
    // this.getRemoteScriptName('id=45184')
    // this.getRemoteScript('id=45184')
  },
  methods: {
    closeMessage() {
      this.message.show = false
      this.message.onContinue = () => {}
      this.message.onCancel = false
    },
    async uploadFile() {
      console.log('Ready to upload', this.fileUpload)
      try {
        const script = JSON.parse(await this.fileUpload.text())
        if (
          !script ||
          !script.pages ||
          (script.modules && script.modules.nyx)
        ) {
          if (script.modules && script.modules.nyx) {
            this.fileError = 'Sorry, NYX teases are not supported.'
          } else {
            this.fileError =
              'Does not appear to be a valid EOS tease (Invalid Definitions)'
          }
        } else {
          if (script.oeosmeta) {
            const meta = script.oeosmeta
            this.title = meta.title
            this.author = meta.author
            this.authorId = meta.authorId
            this.teaseId = meta.teaseId
            this.teaseKey = meta.teaseKey
            this.script = script
          } else {
            this.message.title = 'Warning'
            this.message.html = `This appears to be a raw EOS file, not an Open EOS file.<br>
            Images, etc., will still be loaded from Milovana, and I won't know the title or author of this tease.<br>
            <br>
            Do you want to continue?`
            this.message.onContinue = () => {
              this.title = this.fileUpload.name
              this.script = script
              this.author = 'Unknown'
            }
            this.message.onCancel = () => {}
            this.message.show = true
          }
        }
      } catch (e) {
        this.fileError = 'Invalid JSON ffile'
      }
    },
    async downloadTease() {
      this.downloaded = 0
      const script = this.script
      if (script.galleries) {
        for (const gallery of Object.values(script.galleries)) {
          console.log('Downloading gallery', gallery)
          for (const image of gallery.images) {
            console.log('Downloading gallery image', image)
            this.downloaded += await downloadEosFile(image, true)
          }
        }
      }
      if (script.files) {
        for (const file of Object.values(script.files)) {
          console.log('Downloading file', file)
          this.downloaded += await downloadEosFile(file, true)
        }
      }
      script.oeosmeta = {
        title: this.title,
        author: this.author,
        authorId: this.authorId,
        teaseId: this.teaseId,
        teaseKey: this.teaseKey,
      }
      downloadObjectAsJson(
        script,
        convertToValidFilename(this.title || 'unnamed_tease') + '.oeos.json'
      )
    },
    startDownload() {
      this.downloadDialog = false
      this.downloading = true
      this.downloadTease()
        .then(() => {
          this.downloading = false
        })
        .catch(() => {
          this.downloading = false
          this.message.title = 'Error'
          this.message.html = 'Unable to download tease for unknown reason.'
          this.message.show = true
        })
    },
    loadMilovanaUrl() {
      this.error = null
      if (this.loading) return
      const uri = this.parseTeaseURI()
      if (!uri) {
        this.error = 'Invalid tease URL'
      } else {
        // this.getRemoteScriptName(uri)
        this.getRemoteScript(uri)
      }
    },
    toggleFullscreen() {
      this.isFullscreen = true
      requestAnimationFrame(() => this.$refs.mainPlayer.$el.requestFullscreen())
    },
    parseTeaseURI() {
      var teaseId = (this.teaseUrl || '').match(/id=([0-9a-z]+.*)/i)
      return (teaseId && teaseId[1]) || ''
    },
    getRemoteScript(uri) {
      this.loading = true
      fetch(
        `${CORS_PROXY}https://milovana.com/webteases/geteosscript.php?id=${uri}`
      )
        .then(response => response.json())
        .then(script => {
          if (
            !script ||
            !script.pages ||
            (script.modules && script.modules.nyx)
          ) {
            if (script.modules && script.modules.nyx) {
              this.error = 'Sorry, NYX teases are not supported.'
            } else {
              this.error =
                'Does not appear to be a valid EOS tease (Invalid Definitions)'
            }

            this.loading = false
          } else {
            this.getRemoteScriptName(uri, script)
          }
        })
        .catch(e => {
          this.error = 'Does not appear to be a valid EOS tease (Invalid JSON)'
          console.error('JSON response error', e)
          this.loading = false
        })
    },
    getRemoteScriptName(uri, script) {
      fetch(
        `${CORS_PROXY}https://milovana.com/webteases/showtease.php?id=${uri}`
      )
        .then(response => response.text())
        .then(contents => {
          this.loading = false
          console.log('HTML response', contents)
          try {
            const doc = parser
              .parseFromString(contents, 'text/html')
              .getElementsByTagName('body')[0]
            this.title = doc.getAttribute('data-title')
            this.author = doc.getAttribute('data-author')
            this.authorId = doc.getAttribute('data-author-id')
            this.teaseId = doc.getAttribute('data-tease-id')
            this.teaseKey = doc.getAttribute('data-key')
            if (this.title) document.title = this.title
            this.script = script
          } catch (e) {
            console.error('Error parseing EOS HTML', e)
            this.title = 'Error Getting Title'
          }
        })
        .catch(e => {
          this.error = 'Error loading tease HTML from Milovana'
          console.error('HTML response error', e)
          this.loading = false
        })
    },
  },
}
</script>
<style scoped>
.oeos-title b {
  display: inline-block;
  margin-right: 5px;
}
.oeos-title span {
  opacity: 0.8;
}
.oeos-title svg {
  margin-bottom: -5px;
}
.oeos-title svg + b {
  margin-left: 5px;
}
</style>

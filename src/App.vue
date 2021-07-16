<template>
  <v-app>
    <v-app-bar
      :value="!isFullscreen"
      dense
      app
      color="primary"
      dark
      :class="{ 'oeos-fullscreen': isFullscreen }"
      @click.stop="() => {}"
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
      <span v-if="debugEnabled">{{ pageId }}</span>
      <!-- <v-btn v-if="!formUri && script" icon @click.stop="downloadDialog = true">
        <v-icon>mdi-download</v-icon>
      </v-btn> -->
      <v-btn icon @click="toggleFullscreen">
        <v-icon>mdi-fullscreen</v-icon>
      </v-btn>
      <v-menu v-if="script && hasStorage !== false" bottom :offset-y="true">
        <template v-slot:activator="{ on, attrs }">
          <v-btn icon dark v-bind="attrs" v-on="on">
            <v-icon>mdi-dots-vertical</v-icon>
          </v-btn>
        </template>

        <v-list>
          <v-list-item v-if="!teaseStarted" @click="restoreTeaseStorage">
            <v-list-item-icon>
              <v-icon>mdi-upload</v-icon>
            </v-list-item-icon>
            <v-list-item-title>Restore Tease Storage</v-list-item-title>
          </v-list-item>
          <v-list-item
            v-else
            :disabled="!hasStorage"
            @click="downloadTeaseStorage"
          >
            <v-list-item-icon>
              <v-icon :disabled="!hasStorage">mdi-download</v-icon>
            </v-list-item-icon>
            <v-list-item-title>Download Tease Storage</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-menu>
    </v-app-bar>

    <v-main ref="mainPlayer">
      <open-eos-player
        v-if="script"
        :script="script"
        :title="title"
        :author="author"
        :author-id="authorId"
        :tease-id="teaseId"
        :tease-key="teaseKey"
        :is-fullscreen="this.isFullscreen"
        :tease-storage="teaseStorage"
        :debug-enabled="debugEnabled"
        :tease-url="teaseUrl"
        @page-change="pageChange"
        @save-storage="didStorageSave"
        @load-storage="didStorageLoad"
        @tease-start="didTeaseStart"
        @tease-end="didTeaseEnd"
      />
      <v-container v-else>
        <template v-if="this.formUri && !this.error">
          <loading>Importing...</loading>
        </template>
        <template v-else>
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
                this.formUri = false
              }
            "
          />
          <v-btn @click="loadMilovanaUrl" :loading="loading"
            >Load Tease From URL</v-btn
          >
          <template v-if="!formUri">
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
          </template>
        </template>
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
    <input type="file" ref="teaseStorageLoader" style="display:none" />
  </v-app>
</template>

<script>
import OpenEosPlayer from './components/OpenEosPlayer'
import Loading from './components/common/Loading'
import { version } from '../package.json'
import {
  downloadObjectAsJson,
  downloadEosFile,
  convertToValidFilename,
  encodeForCorsProxy,
  FIX_POLLUTION,
  getFormattedDateForFile,
  acronym,
} from './util/io'
import prettysize from 'prettysize'
import CryptoJS from 'crypto-js'

const parser = new DOMParser()

export default {
  name: 'App',
  components: {
    OpenEosPlayer,
    Loading,
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
    debugEnabled() {
      return !this.formUri || !!this.previewMode
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
    formUri: false,
    previewMode: 0,
    loading: false,
    version: version,
    downloadDialog: false,
    downloading: false,
    fileUpload: null,
    pageId: null,
    downloaded: 0,
    hasStorage: false,
    teaseStarted: false,
    teaseStorage: null,
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

    let uri = window.location.search.substring(1)
    let params = new URLSearchParams(uri)
    const teaseId = params.get('id')
    let previewMode = params.get('preview')
    if (previewMode) {
      previewMode = parseInt(previewMode, 10)
      if (isNaN(previewMode)) previewMode = 0
    } else {
      previewMode = 0
    }
    this.previewMode = previewMode
    if (teaseId) {
      this.formUri = true
      let teaseUrl = `https://milovana.com/webteases/showtease.php&id=${teaseId}`
      const key = params.get('key')
      if (key) {
        teaseUrl += `&key=${key}`
      }
      this.teaseUrl = teaseUrl
      this.loadMilovanaUrl()
    }

    // this.getRemoteScriptName('id=45184')
    // this.getRemoteScript('id=45184')
  },
  methods: {
    restoreTeaseStorage() {
      const input = this.$refs.teaseStorageLoader
      input.type = 'file'
      input.accept = `.oeos_${this.teaseId}`
      input.addEventListener('change', handleFiles, false)
      const vue = this
      function handleFiles() {
        const file = this.files[0]
        if (file) {
          var reader = new FileReader()
          reader.onload = function(e) {
            try {
              const bytes = CryptoJS.AES.decrypt(
                JSON.parse(e.target.result),
                vue.teaseId + '::OEOS'
              )
              const storageData = bytes.toString(CryptoJS.enc.Utf8)
              if (
                storageData &&
                storageData.startsWith('{') &&
                JSON.parse(storageData)
              ) {
                vue.teaseStorage = storageData
              } else {
                console.error('Invalid data?', bytes, storageData)
                throw new Error('Invalid tease storage file', storageData)
              }
            } catch (err) {
              vue.showMessage(
                'Invalid Tease Storage',
                'Sorry, that file does not appear to be a valid storage file for this tease.'
              )
              console.error(err)
            }
          }
          reader.readAsText(file)
        }
      }
      input.click()
    },
    downloadTeaseStorage() {
      const storageData = CryptoJS.AES.encrypt(
        this.teaseStorage,
        this.teaseId + '::OEOS'
      ).toString()
      downloadObjectAsJson(
        storageData,
        convertToValidFilename(
          acronym(this.title) + '-' + getFormattedDateForFile()
        ),
        `oeos_${this.teaseId}`
      )
    },
    didStorageSave(v) {
      if (v && v !== '{}') {
        this.hasStorage = true
      }
      if (v) this.teaseStorage = v
    },
    didStorageLoad(v) {
      if (v && v !== '{}') {
        this.hasStorage = true
      } else if (!v) {
        this.hasStorage = false
      } else {
        this.hasStorage = null
      }
      console.log('Did storage load', v)
      if (v) this.teaseStorage = v
    },
    didTeaseStart() {
      this.teaseStarted = true
    },
    didTeaseEnd() {},
    pageChange(pageId) {
      this.pageId = pageId
    },
    closeMessage() {
      this.message.show = false
      this.message.onContinue = () => {}
      this.message.onCancel = false
    },
    showMessage(title, html, onContinue, onCancel) {
      this.message.title = title
      this.message.html = html
      this.message.onContinue = onContinue || function() {}
      this.message.onCancel = onCancel
      this.message.show = true
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
      this.hasStorage = false
      this.easeStarted = false
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
        encodeForCorsProxy(
          'https://milovana.com/webteases/geteosscript.php',
          `id=${uri}&${FIX_POLLUTION}`
        )
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
          fetch(
            encodeForCorsProxy(
              `https://milovana.com/webteases/showtease.php`,
              `&id=${uri}&${FIX_POLLUTION}`
            )
          )
            .then(response => response.text())
            .then(contents => {
              console.log('Looking for old-school tease', contents)
              this.loading = false
              if (
                parser
                  .parseFromString(contents, 'text/html')
                  .getElementById('tease_title')
              ) {
                this.error = 'Sorry, classic teases are not supported.'
              } else {
                throw e
              }
            })
            .catch(() => {
              this.error =
                'Does not appear to be a valid EOS tease (Invalid JSON)'
              console.error('JSON response error', e)
              this.loading = false
            })
        })
    },
    getRemoteScriptName(uri, script) {
      fetch(
        encodeForCorsProxy(
          `https://milovana.com/webteases/showtease.php`,
          `id=${uri}&${FIX_POLLUTION}`
        )
      )
        .then(response => response.text())
        .then(contents => {
          this.loading = false
          // console.log('HTML response', contents)
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
<style>
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
.theme--dark.v-application {
  background-color: var(--v-background-base, #121212) !important;
}
.theme--light.v-application {
  background-color: var(--v-background-base, white) !important;
}
</style>

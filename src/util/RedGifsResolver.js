class RedGifsResolver {
  constructor(opts) {
    opts = opts || {}
    this._base = opts.base || 'https://api.redgifs.com/'
    this._searchTerms = null
    this._searchTermsResolve = []
    this._searchTermsReject = []
  }

  _loadSearchTerms() {
    if (this._searchTermsResolve.length) {
      return new Promise((afterResolve, reject) => {
        this._searchTermsResolve.push(afterResolve)
        this._searchTermsReject.push(reject)
      })
    } else {
      return new Promise((afterResolve, reject) => {
        this._searchTermsResolve.push(afterResolve)
        this._searchTermsReject.push(reject)
        fetch()
          .then(r => r.json())
          .then(r => {
            const resolvers = this._searchTermsResolve
            this._searchTerms = r
            this._searchTermsResolve = []
            this._searchTermsReject = []
            resolvers.forEach(rs => {
              try {
                rs.call(this, r)
              } catch (e) {
                console.error(e)
              }
            })
          })
          .catch(e => {
            const errorHandlers = this._searchTermsReject
            this._searchTermsResolve = []
            this._searchTermsReject = []
            errorHandlers.forEach(eh => {
              try {
                eh.call(this, e)
              } catch (e2) {
                console.error(e2, e)
              }
            })
          })
      })
    }
  }

  _resolveRedgifApi(request, resolve, reject, count, err) {
    count = count || 0
    count++
    if (count >= 5) {
      reject(
        err ||
          new Error('Maximum retries resolving redgifs API request', request)
      )
      return
    }
    if (!this._searchTerms) {
      this._loadSearchTerms()
        .then(() => {
          this._resolveRedgifApi(request, resolve, reject)
        })
        .catch(e => {
          this._resolveRedgifApi(request, resolve, reject, count, e)
        })
    }
    const type = request.type
    const order = request.order
    const terms = request.rawTerms
    order.trim()
    terms.sort()
    if (!type || type === 'link') {
      //
    } else if (type === 'related') {
      //
    } else if (type === 'user') {
      //
    } else if (type === 'search') {
      //
    }
  }

  load(locator) {
    return new Promise((resolve, reject) => {
      const rga =
        locator &&
        locator.match(
          /^redgifs(-search|-related|-user|-link|)(((-latest|-best|-trending)=*([0-9]*\.*[0-9]*))|)((-min=*([0-9]*\.*[0-9]+))|)((-max=*([0-9]*\.*[0-9]+))|):(-*[a-zA-Z0-9 |,]+)/i
        )
      let result
      if (rga) {
        this._resolveRedgifApi(
          {
            type: (rga[1] || 'link').replace(/^-/, '').toLowerCase(),
            order: (rga[4] || 'trending').replace(/^-/, '').toLowerCase(),
            top: Number(rga[5]) || 20,
            min: Number(rga[8]) || 0,
            max: Number(rga[11]) || 0,
            rawTerms: rga[12].split(/\s*,\s*/).reduce((r, t) => {
              const negate = t.match(/^\s*-*/)
              t = t
                .replace(/[- ]+/, ' ')
                .replace(/\|+/, '|')
                .trim()
              const options = t.split(/\s*\|\s*/).reduce((r2, t2) => {
                t2 = t2.trim()
                if (t2) r2.push(t2)
                return r2
              }, [])
              if (options.length)
                r.push({
                  negate: !!negate,
                  options: options,
                })
              return r
            }, []),
          },
          resolve,
          reject
        )
      } else {
        const r =
          locator &&
          locator.match(
            /^https:\/\/(thumbs[0-9]*\.*redgifs\.com)\/([a-zA-Z0-9]+)(-mobile|).mp4/
          )
        if (r) {
          result = {
            url: locator,
            name: 'RedGifs',
            link: 'https://www.redgifs.com/watch/' + r[2].toLowerCase(),
            thumb: 'https://' + r[1] + '/' + r[2] + r[3] + '.jpg',
            embed:
              'https://www.redgifs.com/ifr/' +
              r[2].toLowerCase() +
              '?autoplay=0',
          }
        } else {
          result = {
            url: locator,
          }
        }
        resolve(result)
      }
    })
  }
}

export default RedGifsResolver

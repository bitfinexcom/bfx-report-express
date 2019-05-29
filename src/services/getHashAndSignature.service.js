'use strict'

const Busboy = require('busboy')
const crypto = require('crypto')

const digitalSignatureVerificationError = new Error(
  'ERR_DIGITAL_SIGNATURE_VERIFICATION_IS_NOT_COMPLETE'
)

module.exports = (req, res) => {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256')
    const args = {
      fileHash: null,
      signature: null
    }

    const busboy = new Busboy({
      headers: req.headers,
      limits: {
        fileSize: 50 * 1024 * 1024,
        files: 1,
        fields: 1
      }
    })

    busboy.on('error', () => {
      reject(digitalSignatureVerificationError)
    })
    busboy.on('field', (fieldname, value) => {
      if (!args.signature) {
        args.signature = value
      }
    })
    busboy.on('file', (
      fieldname,
      fileStream,
      filename
    ) => {
      if (!filename || args.fileHash) {
        return fileStream.resume()
      }
      fileStream.on('error', () => {
        reject(digitalSignatureVerificationError)
      })
      fileStream.on('limit', () => {
        reject(digitalSignatureVerificationError)
      })
      fileStream.on('data', (data) => {
        hash.update(data, 'utf8')
      })
      fileStream.on('end', () => {
        if (!args.fileHash) {
          args.fileHash = hash.digest('hex')
        }
      })
    })
    busboy.on('finish', () => resolve(args))

    req.pipe(busboy)
  })
}

import { useState, useRef, useCallback, useEffect } from 'react'
import jsQR from 'jsqr'

export function useQRScanner({ bougies, onFound }) {
  const [scanning, setScanning] = useState(false)
  const [scanError, setScanError] = useState('')
  const [scanMsg, setScanMsg] = useState('')
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const rafRef = useRef(null)

  const stopScan = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop())
    streamRef.current = null
    setScanning(false)
  }, [])

  useEffect(() => () => stopScan(), [stopScan])

  function scanFrame() {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || !streamRef.current) return
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const code = jsQR(imageData.data, imageData.width, imageData.height)
      if (code) {
        const texte = code.data.trim()
        const found = bougies.find(b =>
          b.nom.toLowerCase() === texte.toLowerCase() ||
          texte.toLowerCase().includes(b.nom.toLowerCase())
        )
        if (found) {
          setScanMsg('✓ Article détecté : ' + found.nom)
          stopScan()
          onFound(found)
          return
        } else {
          setScanMsg('QR lu : "' + texte + '" — article non trouvé')
        }
      }
    }
    rafRef.current = requestAnimationFrame(scanFrame)
  }

  async function startScan() {
    setScanError('')
    setScanMsg('Ouverture de la caméra…')
    setScanning(true)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setScanMsg('Pointez vers un QR code…')
      scanFrame()
    } catch (e) {
      setScanError('Impossible d\'accéder à la caméra : ' + e.message)
      setScanning(false)
    }
  }

  return { scanning, scanError, scanMsg, videoRef, canvasRef, startScan, stopScan }
}

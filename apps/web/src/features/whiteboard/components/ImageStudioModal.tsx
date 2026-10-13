'use client'

import React, { useState, useRef, useEffect } from 'react'
import {
  X,
  Upload,
  Crop as CropIcon,
  Sliders,
  RotateCw,
  Check,
  Image as ImageIcon,
  Sun,
  Contrast,
  Sparkles,
  Maximize2,
} from 'lucide-react'

export interface ImageAdjustments {
  url: string
  rotation: number // 0, 90, 180, 270
  opacity: number // 0.1 to 1.0
  brightness: number // 50 to 150
  contrast: number // 50 to 150
  borderRadius: number // 0 to 32
  croppedUrl?: string
}

interface ImageStudioModalProps {
  isOpen: boolean
  initialUrl?: string
  onClose: () => void
  onApplyImage: (adjustments: ImageAdjustments) => void
}

export function ImageStudioModal({
  isOpen,
  initialUrl,
  onClose,
  onApplyImage,
}: ImageStudioModalProps) {
  const [imageUrl, setImageUrl] = useState<string>(initialUrl || '')
  const [rotation, setRotation] = useState<number>(0)
  const [opacity, setOpacity] = useState<number>(1)
  const [brightness, setBrightness] = useState<number>(100)
  const [contrast, setContrast] = useState<number>(100)
  const [borderRadius, setBorderRadius] = useState<number>(12)
  const [cropAspectRatio, setCropAspectRatio] = useState<'free' | '1:1' | '4:3' | '16:9'>('free')
  const [cropPercent, setCropPercent] = useState<number>(100)
  const [isProcessing, setIsProcessing] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const previewCanvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (initialUrl) {
      setImageUrl(initialUrl)
    }
  }, [initialUrl])

  if (!isOpen) return null

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string
      if (dataUrl) {
        setImageUrl(dataUrl)
        setRotation(0)
        setCropPercent(100)
      }
    }
    reader.readAsDataURL(file)
  }

  const handleRotate = () => {
    setRotation((r) => (r + 90) % 360)
  }

  const handleCropAndApply = () => {
    setIsProcessing(true)

    // Render adjusted & cropped image to off-screen canvas to bake adjustments
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          onApplyImage({
            url: imageUrl,
            rotation,
            opacity,
            brightness,
            contrast,
            borderRadius,
          })
          onClose()
          return
        }

        let srcW = img.naturalWidth || img.width
        let srcH = img.naturalHeight || img.height

        // Calculate crop bounds
        let cropW = srcW * (cropPercent / 100)
        let cropH = srcH * (cropPercent / 100)

        if (cropAspectRatio === '1:1') {
          const side = Math.min(cropW, cropH)
          cropW = side
          cropH = side
        } else if (cropAspectRatio === '4:3') {
          cropH = (cropW * 3) / 4
        } else if (cropAspectRatio === '16:9') {
          cropH = (cropW * 9) / 16
        }

        const startX = (srcW - cropW) / 2
        const startY = (srcH - cropH) / 2

        const isRotated90or270 = rotation === 90 || rotation === 270
        canvas.width = isRotated90or270 ? cropH : cropW
        canvas.height = isRotated90or270 ? cropW : cropH

        ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) opacity(${opacity})`
        ctx.translate(canvas.width / 2, canvas.height / 2)
        ctx.rotate((rotation * Math.PI) / 180)

        const drawW = isRotated90or270 ? canvas.height : canvas.width
        const drawH = isRotated90or270 ? canvas.width : canvas.height

        ctx.drawImage(
          img,
          startX,
          startY,
          cropW,
          cropH,
          -drawW / 2,
          -drawH / 2,
          drawW,
          drawH
        )

        const finalDataUrl = canvas.toDataURL('image/png')
        onApplyImage({
          url: finalDataUrl,
          rotation: 0,
          opacity: 1,
          brightness: 100,
          contrast: 100,
          borderRadius,
        })
        setIsProcessing(false)
        onClose()
      } catch {
        onApplyImage({
          url: imageUrl,
          rotation,
          opacity,
          brightness,
          contrast,
          borderRadius,
        })
        setIsProcessing(false)
        onClose()
      }
    }

    img.onerror = () => {
      onApplyImage({
        url: imageUrl,
        rotation,
        opacity,
        brightness,
        contrast,
        borderRadius,
      })
      setIsProcessing(false)
      onClose()
    }

    img.src = imageUrl
  }

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl rounded-3xl bg-[#14151c] border border-white/15 shadow-2xl overflow-hidden flex flex-col text-zinc-100 select-none animate-scale-in max-h-[92vh]"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between shrink-0 bg-[#181924]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-400 flex items-center justify-center shadow-xs">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Image Studio &amp; Crop</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-semibold border border-purple-500/30">
                  Any Format &bull; Crop &bull; Adjust
                </span>
              </h3>
              <p className="text-xs text-zinc-400">
                Upload PNG, JPG, SVG, WebP, GIF, or BMP, then crop and adjust before inserting on whiteboard.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Studio Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
          {/* File Upload Trigger */}
          <div className="flex items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.png,.jpg,.jpeg,.svg,.webp,.gif,.bmp"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 py-3 px-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-dashed border-white/20 hover:border-purple-400 text-xs font-bold text-zinc-300 hover:text-white flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Upload className="w-4 h-4 text-purple-400" />
              <span>Choose Image File (PNG, JPG, SVG, WebP, GIF)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setImageUrl('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800')
                setRotation(0)
              }}
              className="py-3 px-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer shrink-0"
            >
              Use Sample Art
            </button>
          </div>

          {/* Interactive Live Preview Box */}
          <div className="rounded-2xl border border-white/10 bg-black/60 p-4 flex flex-col items-center justify-center min-h-[220px] max-h-[300px] overflow-hidden relative shadow-inner">
            {imageUrl ? (
              <div
                className="overflow-hidden transition-all duration-150 flex items-center justify-center"
                style={{
                  borderRadius: `${borderRadius}px`,
                  opacity,
                  filter: `brightness(${brightness}%) contrast(${contrast}%)`,
                  transform: `rotate(${rotation}deg) scale(${cropPercent / 100})`,
                }}
              >
                <img
                  src={imageUrl}
                  alt="Preview"
                  className="max-h-[220px] w-auto object-contain select-none shadow-2xl"
                />
              </div>
            ) : (
              <div className="text-center space-y-1.5 text-zinc-500">
                <ImageIcon className="w-10 h-10 mx-auto opacity-40" />
                <p className="text-xs">No image selected yet</p>
                <p className="text-[11px] opacity-75">Click above to upload any image file</p>
              </div>
            )}
          </div>

          {/* Adjustment & Crop Controls */}
          {imageUrl && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1 text-xs">
              {/* Left Column: Crop Aspect Ratios & Zoom/Crop */}
              <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-zinc-300 flex items-center gap-1.5">
                    <CropIcon className="w-3.5 h-3.5 text-purple-400" />
                    <span>Crop Aspect Ratio</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleRotate}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 flex items-center gap-1 text-[11px] cursor-pointer"
                    title="Rotate 90 degrees"
                  >
                    <RotateCw className="w-3 h-3 text-purple-400" />
                    <span>Rotate ({rotation}&deg;)</span>
                  </button>
                </div>

                <div className="grid grid-cols-4 gap-1.5">
                  {(['free', '1:1', '4:3', '16:9'] as const).map((ratio) => (
                    <button
                      key={ratio}
                      type="button"
                      onClick={() => setCropAspectRatio(ratio)}
                      className={`py-1.5 rounded-xl font-bold uppercase transition-all cursor-pointer text-center text-[11px] ${
                        cropAspectRatio === ratio
                          ? 'bg-purple-600 text-white shadow-xs'
                          : 'bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      {ratio}
                    </button>
                  ))}
                </div>

                {/* Crop / Zoom Slider */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-zinc-400">
                    <span>Crop Zoom</span>
                    <span className="font-mono text-purple-400">{cropPercent}%</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="150"
                    value={cropPercent}
                    onChange={(e) => setCropPercent(parseInt(e.target.value, 10))}
                    className="w-full accent-purple-500 cursor-pointer"
                  />
                </div>
              </div>

              {/* Right Column: Visual Adjustments (Brightness, Contrast, Opacity, Roundness) */}
              <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
                <span className="font-bold text-zinc-300 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-purple-400" />
                  <span>Image Adjustments</span>
                </span>

                {/* Brightness */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-zinc-400">
                    <span className="flex items-center gap-1">
                      <Sun className="w-3 h-3" /> Brightness
                    </span>
                    <span className="font-mono text-purple-400">{brightness}%</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="150"
                    value={brightness}
                    onChange={(e) => setBrightness(parseInt(e.target.value, 10))}
                    className="w-full accent-purple-500 cursor-pointer"
                  />
                </div>

                {/* Contrast */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-zinc-400">
                    <span className="flex items-center gap-1">
                      <Contrast className="w-3 h-3" /> Contrast
                    </span>
                    <span className="font-mono text-purple-400">{contrast}%</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="150"
                    value={contrast}
                    onChange={(e) => setContrast(parseInt(e.target.value, 10))}
                    className="w-full accent-purple-500 cursor-pointer"
                  />
                </div>

                {/* Corner Roundness */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-zinc-400">
                    <span>Corner Roundness</span>
                    <span className="font-mono text-purple-400">{borderRadius}px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="32"
                    value={borderRadius}
                    onChange={(e) => setBorderRadius(parseInt(e.target.value, 10))}
                    className="w-full accent-purple-500 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-white/10 flex items-center justify-between shrink-0 bg-[#181924]">
          <span className="text-xs text-zinc-400">
            {imageUrl ? 'Adjustments will be applied to whiteboard element' : 'Upload an image to start'}
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!imageUrl || isProcessing}
              onClick={handleCropAndApply}
              className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-purple-600/30 flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
            >
              <Check className="w-4 h-4" />
              <span>{isProcessing ? 'Processing...' : 'Insert on Whiteboard'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

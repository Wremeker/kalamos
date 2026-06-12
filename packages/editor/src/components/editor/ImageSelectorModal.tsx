import { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { X, Upload, Search, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { imagesApi, UnsplashImage } from '@/api/images'
import { toast } from 'sonner'
import { showErrorToast } from '@/utils/errorUtils'

interface ImageSelectorModalProps {
  onClose: () => void
  onSelectImage: (imageUrl: string) => void
}

export function ImageSelectorModal({ onClose, onSelectImage }: ImageSelectorModalProps) {
  const { t } = useTranslation()
  const [uploading, setUploading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [unsplashImages, setUnsplashImages] = useState<UnsplashImage[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error(t('editor.selectImage'))
      return
    }

    try {
      setUploading(true)
      const uploadedImage = await imagesApi.uploadImage({
        file,
      })
      onSelectImage(uploadedImage.url)
      toast.success(t('editor.imageUploaded'))
    } catch (error: unknown) {
      showErrorToast(error, toast, 'editor.failedToUpload')
    } finally {
      setUploading(false)
    }
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileUpload(file)
    }
  }

  const handleSearchUnsplash = async () => {
    if (!searchQuery.trim()) {
      toast.error(t('editor.enterSearchQuery'))
      return
    }

    try {
      setSearching(true)
      const result = await imagesApi.searchUnsplash(searchQuery)
      setUnsplashImages(result.results)
    } catch {
      toast.error(t('editor.failedToSearch'))
    } finally {
      setSearching(false)
    }
  }

  const handleSelectUnsplashImage = async (image: UnsplashImage) => {
    try {
      setUploading(true)
      
      await imagesApi.trackUnsplashDownload(image.links.download_location)
      
      const uploadedImage = await imagesApi.uploadImageFromUrl(image.urls.regular)
      onSelectImage(uploadedImage.url)
      toast.success(t('editor.imageUploaded'))
    } catch {
      toast.error(t('editor.failedToSelect'))
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {t('editor.selectImageTitle')}
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="p-4 overflow-y-auto max-h-[calc(80vh-80px)]">
          <Tabs defaultValue="upload">
            <TabsList className="w-full">
              <TabsTrigger value="upload" className="flex-1">
                <Upload className="h-4 w-4 mr-2" />
                {t('editor.upload')}
              </TabsTrigger>
              <TabsTrigger value="unsplash" className="flex-1">
                <Search className="h-4 w-4 mr-2" />
                Unsplash
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upload" className="mt-4">
              <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
                <Upload className="h-16 w-16 text-gray-400 dark:text-gray-600 mb-4" />
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  {t('editor.uploadFromComputer')}
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {t('editor.loading')}
                    </>
                  ) : (
                    t('editor.selectFile')
                  )}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="unsplash" className="mt-4">
              <div className="mb-4 flex gap-2">
                <Input
                  type="text"
                  placeholder={t('editor.searchUnsplashPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearchUnsplash()}
                />
                <Button
                  onClick={handleSearchUnsplash}
                  disabled={searching}
                >
                  {searching ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </Button>
              </div>

              {unsplashImages.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {unsplashImages.map((image) => (
                    <div
                      key={image.id}
                      className="relative cursor-pointer group rounded-lg overflow-hidden"
                      onClick={() => handleSelectUnsplashImage(image)}
                    >
                      <img
                        src={imagesApi.getProxiedImageUrl(image.urls.small)}
                        alt={image.alt_description || 'Unsplash image'}
                        className="w-full h-48 object-cover transition-transform group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-opacity flex items-center justify-center">
                        <span className="text-white opacity-0 group-hover:opacity-100 transition-opacity">
                          {t('editor.select')}
                        </span>
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black to-transparent">
                        <p className="text-white text-xs">
                          {t('editor.photoBy')} {image.user.name}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  {searching ? t('editor.searching') : t('editor.searchPlaceholder')}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}


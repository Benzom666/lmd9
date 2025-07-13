import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    console.log("Test photo upload received:", {
      hasPhotos: !!body.photos,
      photosCount: body.photos?.length || 0,
      photosData:
        body.photos?.map((photo: any, index: number) => ({
          index,
          hasUrl: !!photo.url,
          urlLength: photo.url?.length || 0,
          urlType: typeof photo.url,
          isBase64: photo.url?.startsWith("data:") || false,
          type: photo.type,
          hasFile: !!photo.file,
          fileSize: photo.file?.size,
        })) || [],
    })

    return NextResponse.json({
      success: true,
      message: "Test upload received successfully",
      data: {
        photosReceived: body.photos?.length || 0,
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error("Test upload error:", error)
    return NextResponse.json(
      {
        error: "Test upload failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

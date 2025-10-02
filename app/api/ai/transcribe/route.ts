import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const audioFile = formData.get('audio') as File
    
    if (!audioFile) {
      return NextResponse.json(
        { error: 'No audio file provided' },
        { status: 400 }
      )
    }

    // Convert File to the format expected by OpenAI
    const audioBuffer = await audioFile.arrayBuffer()
    const audioBlob = new Blob([audioBuffer], { type: audioFile.type })
    
    // Create a File object for OpenAI API
    const audioForWhisper = new File([audioBlob], audioFile.name, {
      type: audioFile.type,
    })

    // Transcribe using OpenAI Whisper
    const transcription = await openai.audio.transcriptions.create({
      file: audioForWhisper,
      model: 'whisper-1',
      response_format: 'text',
    })

    return NextResponse.json({
      transcription: transcription,
      fileName: audioFile.name,
    })

  } catch (error) {
    console.error('Transcription error:', error)
    return NextResponse.json(
      { error: 'Failed to transcribe audio' },
      { status: 500 }
    )
  }
}


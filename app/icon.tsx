import { Logo } from '@/components/logo'
import { ImageResponse } from 'next/og'

// Image metadata
export const size = {
    width: 32,
    height: 32,
}
export const contentType = 'image/png'

// Image generation
export default function Icon() {
    return new ImageResponse(
        (
            // ImageResponse JSX element
            <div
                style={{
                    fontSize: 24,
                    background: 'black',
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    borderRadius: '4px',
                    border: '1px solid white',
                }}
            >
                <svg viewBox="0 0 255 255" xmlns="http://www.w3.org/2000/svg" width={16} height={16} fill="white">
                    <path fillRule="evenodd" clipRule="evenodd" d="M159 63L127.5 0V255H255L236.5 218H159V63Z" />
                    <path fillRule="evenodd" clipRule="evenodd" d="M-3.05176e-05 255L127.5 -5.96519e-06L127.5 255L-3.05176e-05 255ZM64 217L121 104L121 217L64 217Z" />
                </svg>
            </div>
        ),
        // ImageResponse options
        {
            // For convenience, we can re-use the exported icons size metadata
            // config to also set the ImageResponse's width and height.
            ...size,
        }
    )
}
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
                }}
            >
                <svg width="208" height="219" viewBox="0 0 208 219" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M69 73L208 219L69 219L69 73Z" fill="white" />
                    <path d="M-1.52588e-05 146L139 1.52588e-05L-2.49507e-06 3.10702e-06L-1.52588e-05 146Z" fill="white" />
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
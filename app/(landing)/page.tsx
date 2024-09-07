'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useTheme } from '@/components/context/theme-provider'
import Features from '@/components/features'
import OpenSource from '@/components/open-source'
import GitHubRepoCard from '@/components/open-source'

export default function LandingPage() {
    const { theme } = useTheme();
    const [videoLoaded, setVideoLoaded] = useState(false);
    const [videoError, setVideoError] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        setVideoLoaded(false);
        setVideoError(false);
        
        if (videoRef.current) {
            videoRef.current.load();
        }
    }, [theme]);

    const handleVideoLoad = () => {
        setVideoLoaded(true);
    };

    const handleVideoError = () => {
        setVideoError(true);
    };

    return (
        <div className="flex flex-col min-h-[100dvh] text-gray-900 dark:text-white transition-colors duration-300">
            <main className="flex-1">
                <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48">
                    <div className="container px-4 md:px-6">
                        <div className="grid gap-6 lg:grid-cols-[1fr_400px] lg:gap-12 xl:grid-cols-[1fr_600px]">
                            <div className="flex flex-col justify-center space-y-4">
                                <div className="space-y-2">
                                    <Link href="/updates">
                                        <Button variant="link" className="text-sm font-semibold tracking-wide uppercase text-gray-500 dark:text-gray-400">September Product Updates →</Button>
                                    </Link>
                                    <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none">
                                        Master your trading journey.
                                    </h1>
                                    <p className="max-w-[600px] text-gray-500 dark:text-gray-400 md:text-xl">
                                        Deltalytix is an all-in-one tool for traders to store, explore and understand their track-record.
                                    </p>
                                </div>
                                <div className="flex flex-col gap-2 min-[400px]:flex-row">
                                    <Button className="inline-flex h-10 items-center justify-center rounded-md bg-gray-900 dark:bg-white px-8 text-sm font-medium text-white dark:text-gray-900 shadow transition-colors hover:bg-gray-700 dark:hover:bg-gray-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gray-950 disabled:pointer-events-none disabled:opacity-50" asChild>
                                        <Link href="#talk-to-us">Talk to us</Link>
                                    </Button>
                                    <Button variant="outline" className="inline-flex h-10 items-center justify-center rounded-md border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 px-8 text-sm font-medium shadow-sm transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gray-950 disabled:pointer-events-none disabled:opacity-50" asChild>
                                        <Link href="#get-started">Get Started</Link>
                                    </Button>
                                </div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Used by some of the most successful traders in the world.</p>
                            </div>
                            <div className="flex items-center justify-center">
                                {!videoLoaded && !videoError && (
                                    <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-black rounded-lg">
                                        <p className="text-gray-500 dark:text-gray-400">Loading video...</p>
                                    </div>
                                )}
                                {videoError && (
                                    <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-black rounded-lg">
                                        <p className="text-red-500">Failed to load video</p>
                                    </div>
                                )}
                                <video 
                                    ref={videoRef}
                                    height="600" 
                                    width="600" 
                                    preload="metadata" 
                                    loop 
                                    muted 
                                    autoPlay 
                                    playsInline 
                                    className={`rounded-lg border border-gray-200 dark:border-gray-800 shadow-lg ${videoLoaded ? 'block' : 'hidden'}`}
                                    onLoadedData={handleVideoLoad}
                                    onError={handleVideoError}
                                >
                                    <source src={theme === "dark" ? "https://fhvmtnvjiotzztimdxbi.supabase.co/storage/v1/object/public/assets/demo-dark.mp4" : "https://fhvmtnvjiotzztimdxbi.supabase.co/storage/v1/object/public/assets/demo.mp4"} type="video/mp4" />
                                    <track
                                        src="/path/to/captions.vtt"
                                        kind="subtitles"
                                        srcLang="en"
                                        label="English"
                                    />
                                    Your browser does not support the video tag.
                                </video>
                            </div>
                        </div>
                    </div>
                </section>
                <section id="features" className="w-full py-12 md:py-24 lg:py-32 xl:py-48">
                    <Features />
                </section>
                <section id="open-source" className="w-full py-12 md:py-24 lg:py-32 xl:py-48">
                    <GitHubRepoCard />
                </section>
            </main>
        </div>
    )
}
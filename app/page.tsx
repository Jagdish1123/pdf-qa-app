"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Upload, MessageCircle, FileText, Loader2, AlertCircle, CheckCircle } from "lucide-react"

interface UploadResponse {
    success: boolean
    message: string
    details?: {
        filename: string
        textLength: number
        chunksCreated: number
        totalChunksInDatabase: number
    }
    error?: string
}

interface AnswerResponse {
    question: string
    answer: string
    sources: Array<{
        filename: string
        chunkIndex: number
        content: string
        relevance: number
    }>
    confidence: number
    metadata?: {
        chunksRetrieved: number
        totalChunksInDatabase: number
    }
    error?: string
}

export default function PDFQAApp() {
    const [file, setFile] = useState<File | null>(null)
    const [uploading, setUploading] = useState(false)
    const [uploadResult, setUploadResult] = useState<UploadResponse | null>(null)
    const [question, setQuestion] = useState("")
    const [asking, setAsking] = useState(false)
    const [answer, setAnswer] = useState<AnswerResponse | null>(null)

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0]
        if (selectedFile && selectedFile.type === "application/pdf") {
            setFile(selectedFile)
            setUploadResult(null)
        } else {
            alert("Please select a PDF file")
        }
    }

    const handleUpload = async () => {
        if (!file) return

        setUploading(true)
        setUploadResult(null)

        try {
            const formData = new FormData()
            formData.append("file", file)

            const response = await fetch("/api/upload", {
                method: "POST",
                body: formData,
            })

            const result = await response.json()
            setUploadResult(result)

            if (result.success) {
                setFile(null)
                // Reset file input
                const fileInput = document.getElementById("file-input") as HTMLInputElement
                if (fileInput) fileInput.value = ""
            }
        } catch (error) {
            setUploadResult({
                success: false,
                message: "Upload failed",
                error: "Network error occurred",
            })
        } finally {
            setUploading(false)
        }
    }

    const handleAsk = async () => {
        if (!question.trim()) return

        setAsking(true)
        setAnswer(null)

        try {
            const response = await fetch("/api/ask", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ question: question.trim() }),
            })

            const result = await response.json()
            setAnswer(result)

            if (result.answer) {
                setQuestion("")
            }
        } catch (error) {
            setAnswer({
                question,
                answer: "",
                sources: [],
                confidence: 0,
                error: "Network error occurred",
            })
        } finally {
            setAsking(false)
        }
    }

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault()
            handleAsk()
        }
    }

    return (
        <div className="min-h-screen bg-background p-4">
            <div className="mx-auto max-w-4xl space-y-6">
                {/* Header */}
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-bold text-balance">PDF Question & Answer</h1>
                    <p className="text-muted-foreground text-pretty">Upload a PDF document and ask questions about its content</p>
                </div>

                {/* Upload Section */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Upload className="h-5 w-5" />
                            Upload PDF Document
                        </CardTitle>
                        <CardDescription>Select a PDF file to extract text and enable question answering</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center gap-4">
                            <Input id="file-input" type="file" accept=".pdf" onChange={handleFileChange} className="flex-1" />
                            <Button onClick={handleUpload} disabled={!file || uploading} className="min-w-24">
                                {uploading ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                        Processing
                                    </>
                                ) : (
                                    "Upload"
                                )}
                            </Button>
                        </div>

                        {uploadResult && (
                            <div
                                className={`p-4 rounded-lg border ${
                                    uploadResult.success
                                        ? "bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800"
                                        : "bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800"
                                }`}
                            >
                                <div className="flex items-start gap-2">
                                    {uploadResult.success ? (
                                        <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
                                    ) : (
                                        <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
                                    )}
                                    <div className="space-y-1">
                                        <p
                                            className={`font-medium ${
                                                uploadResult.success ? "text-green-800 dark:text-green-200" : "text-red-800 dark:text-red-200"
                                            }`}
                                        >
                                            {uploadResult.message}
                                        </p>
                                        {uploadResult.details && (
                                            <div className="text-sm text-green-700 dark:text-green-300 space-y-1">
                                                <p>File: {uploadResult.details.filename}</p>
                                                <p>Created {uploadResult.details.chunksCreated} text chunks</p>
                                                <p>Total chunks in database: {uploadResult.details.totalChunksInDatabase}</p>
                                            </div>
                                        )}
                                        {uploadResult.error && (
                                            <p className="text-sm text-red-700 dark:text-red-300">{uploadResult.error}</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Question Section */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <MessageCircle className="h-5 w-5" />
                            Ask a Question
                        </CardTitle>
                        <CardDescription>Ask questions about the content of your uploaded PDF</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex gap-4">
                            <Textarea
                                placeholder="What would you like to know about the document?"
                                value={question}
                                onChange={(e) => setQuestion(e.target.value)}
                                onKeyDown={handleKeyPress}
                                className="flex-1 min-h-20 resize-none"
                                maxLength={500}
                            />
                            <Button onClick={handleAsk} disabled={!question.trim() || asking} className="self-end min-w-24">
                                {asking ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                        Thinking
                                    </>
                                ) : (
                                    "Ask"
                                )}
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">Press Enter to ask, Shift+Enter for new line</p>
                    </CardContent>
                </Card>

                {/* Answer Section */}
                {answer && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FileText className="h-5 w-5" />
                                Answer
                            </CardTitle>
                            {answer.confidence > 0 && (
                                <div className="flex items-center gap-2">
                                    <Badge variant={answer.confidence > 0.7 ? "default" : "secondary"}>
                                        {Math.round(answer.confidence * 100)}% confidence
                                    </Badge>
                                    {answer.metadata && (
                                        <span className="text-sm text-muted-foreground">
                                            Based on {answer.metadata.chunksRetrieved} relevant sections
                                        </span>
                                    )}
                                </div>
                            )}
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {answer.error ? (
                                <div className="p-4 rounded-lg border bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800">
                                    <div className="flex items-start gap-2">
                                        <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
                                        <p className="text-red-800 dark:text-red-200">{answer.error}</p>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="prose prose-sm max-w-none dark:prose-invert">
                                        <p className="text-foreground leading-relaxed whitespace-pre-wrap">{answer.answer}</p>
                                    </div>

                                    {answer.sources.length > 0 && (
                                        <>
                                            <Separator />
                                            <div className="space-y-3">
                                                <h4 className="font-medium text-sm">Sources:</h4>
                                                <div className="space-y-2">
                                                    {answer.sources.map((source, index) => (
                                                        <div key={index} className="p-3 rounded-lg border bg-muted/50 text-sm">
                                                            <div className="flex items-center justify-between mb-2">
                                                                <span className="font-medium">{source.filename}</span>
                                                                {/* FINAL FIX: Added || 0 to handle cases where relevance is undefined */}
                                                                <Badge variant="outline" className="text-xs">
                                                                    {Math.round((source.relevance || 0) * 100)}% relevant
                                                                </Badge>
                                                            </div>
                                                            <p className="text-muted-foreground leading-relaxed">{source.content}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </>
                            )}
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    )
}
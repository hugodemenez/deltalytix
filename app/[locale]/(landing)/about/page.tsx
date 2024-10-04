import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { BookOpen, Code, LineChart, GraduationCap } from "lucide-react"

export default function AboutPage() {
  const founderSkills = [
    { name: "Order Book Trading", icon: <BookOpen className="w-4 h-4" /> },
    { name: "Volume Profile", icon: <LineChart className="w-4 h-4" /> },
    { name: "Computer Science", icon: <Code className="w-4 h-4" /> },
    { name: "Quantitative Finance", icon: <GraduationCap className="w-4 h-4" /> },
  ]

  return (
    <div className="px-4 py-12 bg-background text-foreground">
      <h1 className="text-4xl font-bold text-center mb-8">About Deltalytix</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="text-2xl">Our Mission</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              At Deltalytix, we&apos;re on a mission to empower traders with advanced analytics and AI-driven insights. 
              Our platform is designed to help you understand your trading patterns, optimize your strategies, 
              and ultimately become a better trader through comprehensive backtesting and analysis of your real track record.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="text-2xl">The Founder&apos;s Story</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              With over 5 years of trading experience, our founder has mastered order book trading with a specific 
              focus on volume profile. Combining a strong background in engineering, computer science, and financial 
              markets, along with a master&apos;s degree in quantitative finance, he identified a gap in the market for 
              a tool that could truly help traders understand and improve their performance.
            </p>
            <p className="text-muted-foreground">
              This unique blend of skills and experience led to the creation of Deltalytix - a platform that 
              reflects the needs of serious traders looking to gain deeper insights into their trading patterns 
              and performance.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card md:col-span-2">
          <CardHeader>
            <CardTitle className="text-2xl">Founder&apos;s Expertise</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {founderSkills.map((skill, index) => (
                <Badge key={index} variant="secondary" className="text-sm py-1 px-2 flex items-center gap-1">
                  {skill.icon}
                  {skill.name}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card md:col-span-2">
          <CardHeader>
            <CardTitle className="text-2xl">Why Deltalytix?</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>Built by a trader, for traders</li>
              <li>Advanced analytics powered by real-world trading experience</li>
              <li>Comprehensive backtesting using your actual trade history</li>
              <li>AI-driven insights to improve your trading psychology</li>
              <li>Tailored to serious traders looking to elevate their performance</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
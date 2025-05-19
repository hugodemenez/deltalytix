"use client";
import React from "react";
import type { CardComponentProps } from "onborda";
import { useOnborda } from "onborda";

// Shadcn
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// Icons
import { X } from "lucide-react";

// Confetti
import confetti from "canvas-confetti";

export const TourCard: React.FC<CardComponentProps> = ({
  step,
  currentStep,
  totalSteps,
  nextStep,
  prevStep,
  arrow,
}) => {
  // Onborda hooks
  const { closeOnborda } = useOnborda();

  function handleConfetti() {
    closeOnborda();
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
    });
  }

  return (
    <Card className="relative w-[300px] max-w-[90vw] z-[999] bg-background border shadow-lg">
      <CardHeader>
        <div className="flex items-start justify-between w-full space-x-4">
          <div className="flex flex-col space-y-2">
            <CardDescription className="text-muted-foreground">
              {currentStep + 1} of {totalSteps}
            </CardDescription>
            <CardTitle className="mb-2 text-lg text-foreground line-clamp-2">
              {step.icon} {step.title}
            </CardTitle>
          </div>
          <Button
            variant="ghost"
            className="text-muted-foreground absolute top-4 right-2 hover:bg-accent hover:text-accent-foreground"
            size="icon"
            onClick={() => closeOnborda()}
          >
            <X size={16} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="text-foreground prose-sm dark:prose-invert max-h-[200px] overflow-y-auto">
        {step.content}
      </CardContent>
      <CardFooter>
        <div className="flex justify-between w-full gap-4">
          {currentStep !== 0 && (
            <Button
              onClick={() => prevStep()}
              variant="outline"
            >
              Previous
            </Button>
          )}
          {currentStep + 1 !== totalSteps && (
            <Button
              onClick={() => nextStep()}
              className="ml-auto"
            >
              Next
            </Button>
          )}
          {currentStep + 1 === totalSteps && (
            <Button
              className="ml-auto"
              onClick={handleConfetti}
            >
              🎉 Finish!
            </Button>
          )}
        </div>
      </CardFooter>
      <span>{arrow}</span>
    </Card>
  );
};
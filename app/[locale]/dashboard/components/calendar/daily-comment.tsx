"use client";

import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/locales/client";
import { toast } from "sonner";
import { CalendarEntry } from "@/app/[locale]/dashboard/types/calendar";
import { saveJournal, getMoodForDay } from "@/server/journal";
import { format } from "date-fns";
import { useUserStore } from "../../../../../store/user-store";
import { useMoodStore } from "@/store/widgets/mood-store";

import { Skeleton } from "@/components/ui/skeleton";
import { JournalEditor } from "@/components/journal-editor";

interface DailyCommentProps {
  dayData: CalendarEntry | undefined;
  selectedDate: Date;
}

interface Mood {
  id: string;
  userId: string;
  day: Date;
  emotionValue: number;
  hasTradingExperience: boolean | null;
  selectedNews: string[];
  journalContent: string | null;
  journalContentUndecryptable?: boolean;
  conversation: any;
  createdAt: Date;
  updatedAt: Date;
}

export function DailyComment({ dayData, selectedDate }: DailyCommentProps) {
  const t = useI18n();
  const user = useUserStore((state) => state.user);
  const moodHistory = useMoodStore((state) => state.moods);
  const setMoodHistory = useMoodStore((state) => state.setMoods);
  const [comment, setComment] = React.useState<string>("");
  const [journalUnread, setJournalUnread] = React.useState(false);
  const [isSavingComment, setIsSavingComment] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  // Load comment from moodHistory or server on mount
  React.useEffect(() => {
    const loadComment = async () => {
      if (!user?.id) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setJournalUnread(false);
        // Ensure selectedDate is a Date object
        const date =
          selectedDate instanceof Date ? selectedDate : new Date(selectedDate);
        const dateKey = format(date, "yyyy-MM-dd");

        // First check moodHistory
        const moodForDate = moodHistory?.find((mood) => {
          if (!mood?.day) return false;
          const moodDate =
            mood.day instanceof Date ? mood.day : new Date(mood.day);
          return format(moodDate, "yyyy-MM-dd") === dateKey;
        });

        const historyUnread = Boolean(
          (moodForDate as Mood | undefined)?.journalContentUndecryptable,
        );
        if (historyUnread) {
          setJournalUnread(true);
          setComment("");
          setIsLoading(false);
          return;
        }

        if (moodForDate?.journalContent) {
          setJournalUnread(false);
          setComment(moodForDate.journalContent);
          setIsLoading(false);
          return;
        }

        // If not in moodHistory, try to load from server
        const mood = await getMoodForDay(dateKey);
        if (mood) {
          const unread = Boolean(
            (mood as { journalContentUndecryptable?: boolean })
              .journalContentUndecryptable,
          );
          setJournalUnread(unread);
          setComment(unread ? "" : mood.journalContent || "");
        } else {
          setJournalUnread(false);
        }
      } catch (error) {
        console.error("Error loading comment:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadComment();
  }, [user?.id, selectedDate, moodHistory]);

  const handleSaveComment = async () => {
    if (!user?.id) {
      toast.error(t("auth.required"));
      return;
    }

    if (journalUnread) {
      return;
    }

    setIsSavingComment(true);
    setSaveError(null);

    try {
      // Ensure selectedDate is a Date object
      const date =
        selectedDate instanceof Date ? selectedDate : new Date(selectedDate);
      const dateKey = format(date, "yyyy-MM-dd");

      // Save to server
      const savedMood = await saveJournal(comment, dateKey);

      // Update the moodHistory in context
      const updatedMoodHistory =
        moodHistory?.filter((mood) => {
          if (!mood?.day) return true;
          const moodDate =
            mood.day instanceof Date ? mood.day : new Date(mood.day);
          const moodDateKey = format(moodDate, "yyyy-MM-dd");
          return moodDateKey !== dateKey;
        }) || [];
      setMoodHistory([...updatedMoodHistory, savedMood]);

      toast.success(t("calendar.charts.commentSaved"));
    } catch (error) {
      console.error("Error saving comment:", error);
      setSaveError(t("calendar.charts.commentError"));
      toast.error(t("calendar.charts.commentError"));
    } finally {
      setIsSavingComment(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div
        className={cn(
          "flex-1 min-h-0",
          isSavingComment && "opacity-50",
          saveError && "border-destructive",
        )}
      >
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-[400px] w-full" />
          </div>
        ) : (
          <>
            {journalUnread ? (
              <p className="mb-3 text-sm text-muted-foreground">
                This journal entry could not be decrypted and was not
                overwritten.
              </p>
            ) : null}
            <JournalEditor
              key={`${(selectedDate instanceof Date ? selectedDate : new Date(selectedDate)).toISOString()}-${comment ? "has-content" : "no-content"}`}
              content={comment}
              onChange={setComment}
              height="100%"
              width="100%"
              placeholder={t("mindset.journaling.placeholder")}
              readOnly={journalUnread}
            />
          </>
        )}
      </div>
      <div className="flex items-center justify-between">
        {isSavingComment && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("calendar.charts.saving")}
          </div>
        )}
        {saveError && <p className="text-sm text-destructive">{saveError}</p>}
        <Button
          onClick={handleSaveComment}
          disabled={isLoading || isSavingComment || journalUnread || !comment.trim()}
          size="sm"
        >
          {t("calendar.charts.saveComment")}
        </Button>
      </div>
    </div>
  );
}

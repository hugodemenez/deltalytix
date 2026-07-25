"use client";

import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { useI18n } from "@/locales/client";

type ConsentTranslator = ReturnType<typeof useI18n>;

export type ConsentPreferenceSettings = {
  analytics_storage: boolean;
  ad_storage: boolean;
  ad_user_data: boolean;
  ad_personalization: boolean;
  functionality_storage: boolean;
  personalization_storage: boolean;
  security_storage: boolean;
};

type ConsentPreferencesProps = {
  t: ConsentTranslator;
  isDesktop: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: ConsentPreferenceSettings;
  setSettings: (settings: ConsentPreferenceSettings) => void;
  onSave: () => void;
};

function PreferenceFields({
  t,
  settings,
  setSettings,
}: {
  t: ConsentTranslator;
  settings: ConsentPreferenceSettings;
  setSettings: (settings: ConsentPreferenceSettings) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked
          disabled
          className="mt-1 h-4 w-4 rounded border-gray-300 bg-gray-100"
        />
        <div>
          <label className="text-sm font-medium text-gray-900">
            {t("landing.consent.preferences.strictlyNecessary.title")}
          </label>
          <p className="text-sm text-gray-600 mt-1">
            {t("landing.consent.preferences.strictlyNecessary.description")}
          </p>
        </div>
      </div>

      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={settings.analytics_storage}
          onChange={(e) =>
            setSettings({ ...settings, analytics_storage: e.target.checked })
          }
          className="mt-1 h-4 w-4 rounded border-gray-300"
        />
        <div>
          <label className="text-sm font-medium text-gray-900">
            {t("landing.consent.preferences.analytics.title")}
          </label>
          <p className="text-sm text-gray-600 mt-1">
            {t("landing.consent.preferences.analytics.description")}
          </p>
        </div>
      </div>

      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={settings.ad_storage}
          onChange={(e) =>
            setSettings({ ...settings, ad_storage: e.target.checked })
          }
          className="mt-1 h-4 w-4 rounded border-gray-300"
        />
        <div>
          <label className="text-sm font-medium text-gray-900">
            {t("landing.consent.preferences.marketing.title")}
          </label>
          <p className="text-sm text-gray-600 mt-1">
            {t("landing.consent.preferences.marketing.description")}
          </p>
        </div>
      </div>
    </div>
  );
}

export function ConsentPreferences({
  t,
  isDesktop,
  open,
  onOpenChange,
  settings,
  setSettings,
  onSave,
}: ConsentPreferencesProps) {
  if (isDesktop) {
    return (
      <>
        {open ? (
          <div className="fixed inset-0 z-9998 bg-black/20 backdrop-blur-xs" />
        ) : null}
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent className="fixed left-[50%] top-[50%] z-9999 translate-x-[-50%] translate-y-[-50%] bg-white rounded-lg shadow-xl max-w-[480px] w-[90vw] max-h-[80vh] overflow-hidden border-0">
            <DialogHeader className="p-6 pb-4">
              <DialogTitle className="text-lg font-medium text-gray-900">
                {t("landing.consent.preferences.title")}
              </DialogTitle>
              <DialogDescription className="text-sm text-gray-600 mt-2 leading-relaxed">
                {t("landing.consent.preferences.description")}{" "}
                <a href="#" className="text-blue-600 underline">
                  {t("landing.consent.preferences.learnMore")}
                </a>
                .
              </DialogDescription>
            </DialogHeader>
            <div className="px-6 pb-6">
              <PreferenceFields
                t={t}
                settings={settings}
                setSettings={setSettings}
              />
              <div className="mt-6">
                <Button
                  onClick={onSave}
                  className="w-full bg-black text-white hover:bg-black/90 rounded-lg h-11"
                >
                  {t("landing.consent.preferences.done")}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="z-10000 bg-white rounded-t-lg">
        <div className="h-[80vh] flex flex-col">
          <DrawerHeader className="text-left px-6 py-6">
            <DrawerTitle className="text-lg font-medium text-gray-900">
              {t("landing.consent.preferences.title")}
            </DrawerTitle>
            <DrawerDescription className="text-sm text-gray-600 mt-2 leading-relaxed">
              {t("landing.consent.preferences.description")}{" "}
              <a href="#" className="text-blue-600 underline">
                {t("landing.consent.preferences.learnMore")}
              </a>
              .
            </DrawerDescription>
          </DrawerHeader>
          <div className="flex-1 overflow-y-auto px-6">
            <div className="pb-6">
              <PreferenceFields
                t={t}
                settings={settings}
                setSettings={setSettings}
              />
            </div>
          </div>
          <DrawerFooter className="px-6 pb-6">
            <Button
              onClick={onSave}
              className="w-full bg-black text-white hover:bg-black/90 rounded-lg h-11"
            >
              {t("landing.consent.preferences.done")}
            </Button>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

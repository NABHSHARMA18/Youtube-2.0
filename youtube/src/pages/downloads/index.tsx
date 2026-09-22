import React, {
  useEffect,
  useState,
} from "react";

import {
  Download,
  FileVideo,
  Calendar,
  HardDrive,
  ShieldCheck,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";

import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";

const DownloadsPage = () => {
  const { user } = useUser();

  const [downloads, setDownloads] =
    useState<any[]>([]);

  const [quota, setQuota] =
    useState<any>(null);

  const [loading, setLoading] =
    useState(true);

  const fetchDownloads = async () => {
    if (!user?._id) {
      setLoading(false);
      return;
    }

    try {
      const response =
        await axiosInstance.get(
          `/download/history/${user._id}`
        );

      setDownloads(
        response.data.downloads || []
      );

      setQuota(
        response.data.quota || null
      );
    } catch (error) {
      console.log(
        "DOWNLOAD HISTORY ERROR:",
        error
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDownloads();
  }, [user]);

  // ==========================================
  // FILE SIZE FORMAT
  // ==========================================

  const formatFileSize = (
    bytes: number
  ) => {
    if (!bytes) {
      return "Unknown size";
    }

    if (bytes < 1024) {
      return `${bytes} B`;
    }

    if (
      bytes <
      1024 * 1024
    ) {
      return `${(
        bytes / 1024
      ).toFixed(1)} KB`;
    }

    if (
      bytes <
      1024 * 1024 * 1024
    ) {
      return `${(
        bytes /
        (1024 * 1024)
      ).toFixed(1)} MB`;
    }

    return `${(
      bytes /
      (1024 * 1024 * 1024)
    ).toFixed(1)} GB`;
  };

  // ==========================================
  // DATE FORMAT
  // ==========================================

  const formatDate = (
    date: string
  ) => {
    if (!date) {
      return "Unknown";
    }

    return new Date(
      date
    ).toLocaleString();
  };

  // ==========================================
  // PLAN NAME
  // ==========================================

  const formatPlanName = (
    plan: string
  ) => {
    if (!plan) {
      return "Free";
    }

    return (
      plan.charAt(0).toUpperCase() +
      plan.slice(1)
    );
  };

  // ==========================================
  // STATUS ICON
  // ==========================================

  const getStatusIcon = (
    status: string
  ) => {
    if (status === "completed") {
      return (
        <CheckCircle className="w-4 h-4" />
      );
    }

    if (status === "failed") {
      return (
        <XCircle className="w-4 h-4" />
      );
    }

    return (
      <Clock className="w-4 h-4" />
    );
  };

  // ==========================================
  // NOT LOGGED IN
  // ==========================================

  if (!user) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Download className="w-7 h-7" />

          <h1 className="text-2xl font-semibold">
            Downloads
          </h1>
        </div>

        <p className="text-gray-600">
          Please login to view your downloads.
        </p>
      </div>
    );
  }

  // ==========================================
  // PAGE
  // ==========================================

  return (
    <div className="p-6">

      {/* ======================================
          HEADER
      ====================================== */}

      <div className="flex items-center gap-3 mb-6">
        <Download className="w-7 h-7" />

        <div>
          <h1 className="text-2xl font-semibold">
            Downloads
          </h1>

          <p className="text-sm text-gray-500">
            Manage your downloaded videos
          </p>
        </div>
      </div>


      {/* ======================================
          QUOTA SECTION
      ====================================== */}

      {quota && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">

          {/* PLAN */}

          <div className="border rounded-xl p-5 bg-white shadow-sm">
            <div className="flex items-center gap-3">

              <ShieldCheck className="w-6 h-6" />

              <div>
                <p className="text-sm text-gray-500">
                  Current Plan
                </p>

                <p className="text-lg font-semibold">
                  {quota.planName}
                </p>

                <p className="text-xs text-gray-500 mt-1">
                  Status:{" "}
                  {quota.status}
                </p>
              </div>

            </div>
          </div>


          {/* DAILY */}

          <div className="border rounded-xl p-5 bg-white shadow-sm">

            <div className="flex items-center gap-3">

              <Download className="w-6 h-6" />

              <div className="flex-1">

                <p className="text-sm text-gray-500">
                  Daily Downloads
                </p>

                <p className="text-lg font-semibold">
                  {quota.dailyRemaining}{" "}
                  remaining
                </p>

                <p className="text-xs text-gray-500">
                  {quota.dailyUsed} /{" "}
                  {quota.dailyLimit} used today
                </p>

                <div className="w-full bg-gray-200 rounded-full h-2 mt-3">

                  <div
                    className="bg-black h-2 rounded-full"
                    style={{
                      width: `${
                        quota.dailyLimit
                          ? Math.min(
                              100,
                              (quota.dailyUsed /
                                quota.dailyLimit) *
                                100
                            )
                          : 0
                      }%`,
                    }}
                  />

                </div>

              </div>

            </div>

          </div>


          {/* MONTHLY */}

          <div className="border rounded-xl p-5 bg-white shadow-sm">

            <div className="flex items-center gap-3">

              <Calendar className="w-6 h-6" />

              <div className="flex-1">

                <p className="text-sm text-gray-500">
                  Monthly Downloads
                </p>

                <p className="text-lg font-semibold">
                  {quota.monthlyRemaining}{" "}
                  remaining
                </p>

                <p className="text-xs text-gray-500">
                  {quota.monthlyUsed} /{" "}
                  {quota.monthlyLimit} used this month
                </p>

                <div className="w-full bg-gray-200 rounded-full h-2 mt-3">

                  <div
                    className="bg-black h-2 rounded-full"
                    style={{
                      width: `${
                        quota.monthlyLimit
                          ? Math.min(
                              100,
                              (quota.monthlyUsed /
                                quota.monthlyLimit) *
                                100
                            )
                          : 0
                      }%`,
                    }}
                  />

                </div>

              </div>

            </div>

          </div>

        </div>
      )}


      {/* ======================================
          LOADING
      ====================================== */}

      {loading ? (
        <div className="py-20 text-center">

          <Download className="w-10 h-10 mx-auto mb-4 animate-pulse" />

          <p className="text-gray-600">
            Loading downloads...
          </p>

        </div>


      /* ======================================
         NO DOWNLOADS
      ====================================== */

      ) : downloads.length === 0 ? (

        <div className="flex flex-col items-center justify-center py-20 text-gray-500">

          <Download className="w-12 h-12 mb-4" />

          <h2 className="text-lg font-medium">
            No downloads yet
          </h2>

          <p className="text-sm mt-1">
            Videos you download will appear here.
          </p>

        </div>


      /* ======================================
         DOWNLOAD LIST
      ====================================== */

      ) : (

        <div className="space-y-4">

          {downloads.map(
            (item) => (

              <div
                key={item._id}
                className="flex flex-col md:flex-row gap-4 p-4 border rounded-xl bg-white shadow-sm"
              >

                {/* VIDEO PREVIEW */}

                <div className="w-full md:w-48 h-28 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">

                  <FileVideo className="w-10 h-10 text-gray-400" />

                </div>


                {/* DETAILS */}

                <div className="flex-1">

                  {/* TITLE */}

                  <h2 className="font-semibold text-lg">
                    {item.videoid?.videotitle ||
                      "Unknown video"}
                  </h2>


                  {/* DETAILS GRID */}

                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600">

                    {/* DATE */}

                    <p>
                      <strong>
                        Downloaded:
                      </strong>{" "}
                      {formatDate(
                        item.downloadAt
                      )}
                    </p>


                    {/* STATUS */}

                    <p className="flex items-center gap-1">

                      <strong>
                        Status:
                      </strong>

                      <span
                        className={`flex items-center gap-1 ${
                          item.status ===
                          "completed"
                            ? "text-green-600"
                            : item.status ===
                              "failed"
                            ? "text-red-600"
                            : "text-yellow-600"
                        }`}
                      >

                        {getStatusIcon(
                          item.status
                        )}

                        {item.status}

                      </span>

                    </p>


                    {/* FILE SIZE */}

                    <p>
                      <strong>
                        File size:
                      </strong>{" "}
                      {formatFileSize(
                        item.fileSize ||
                          item.videoid?.filesize
                      )}
                    </p>


                    {/* PLAN */}

                    <p>
                      <strong>
                        Plan:
                      </strong>{" "}
                      {formatPlanName(
                        item.subscriptionPlan
                      )}
                    </p>


                    {/* DEVICE */}

                    <p>
                      <strong>
                        Device:
                      </strong>{" "}
                      {item.device ||
                        "Unknown"}
                    </p>


                    {/* BROWSER */}

                    <p>
                      <strong>
                        Browser:
                      </strong>{" "}
                      {item.browser ||
                        "Unknown"}
                    </p>

                  </div>


                  {/* ERROR MESSAGE */}

                  {item.status ===
                    "failed" &&
                    item.errorMessage && (

                      <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">

                        <strong>
                          Download error:
                        </strong>{" "}
                        {item.errorMessage}

                      </div>

                    )}


                  {/* AUDIT INFORMATION */}

                  <div className="flex items-center gap-2 mt-4 text-xs text-gray-500">

                    <HardDrive className="w-4 h-4" />

                    Download recorded for
                    auditing.

                  </div>

                </div>

              </div>

            )
          )}

        </div>

      )}

    </div>
  );
};

export default DownloadsPage;
package expo.modules.appblocker

import android.content.ComponentName
import android.content.Intent
import android.net.Uri
import android.provider.Settings
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record

/** Config pushed from JS whenever progress or settings change. */
class BlockerConfig : Record {
  @Field var enabled: Boolean = false
  @Field var blockedPackages: List<String> = emptyList()
  @Field var dailyGoal: Int = 3
  @Field var learnedToday: Int = 0
  @Field var grantedMs: Double = 0.0
  @Field var deadlineMs: Double = 0.0
  @Field var reserveMs: Double = 0.0
  @Field var day: String = ""
}

class AppBlockerModule : Module() {
  private val context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("AppBlocker")

    Function("setConfig") { config: BlockerConfig ->
      BlockerStore.write(context, config)
    }

    Function("getUsedMs") {
      BlockerStore.usedTodayMs(context)
    }

    Function("isServiceEnabled") {
      val enabled = Settings.Secure.getString(context.contentResolver, Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES)
        ?: return@Function false
      val service = ComponentName(context, BlockerService::class.java)
      enabled.split(':').any { ComponentName.unflattenFromString(it) == service }
    }

    Function("openAccessibilitySettings") {
      context.startActivity(Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    }

    // Android 13+ hides accessibility for sideloaded apps until "Allow restricted settings" is enabled here.
    Function("openAppSettings") {
      context.startActivity(
        Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:${context.packageName}"))
          .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
      )
    }

    AsyncFunction("getLaunchableApps") {
      val pm = context.packageManager
      val launcher = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER)
      pm.queryIntentActivities(launcher, 0)
        .map { it.activityInfo.packageName to it.loadLabel(pm).toString() }
        .filter { (pkg, _) -> pkg != context.packageName }
        .distinctBy { (pkg, _) -> pkg }
        .sortedBy { (_, label) -> label.lowercase() }
        .map { (pkg, label) -> mapOf("packageName" to pkg, "label" to label) }
    }
  }
}

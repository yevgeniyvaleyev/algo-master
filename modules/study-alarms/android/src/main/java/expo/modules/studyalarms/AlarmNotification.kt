package expo.modules.studyalarms

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.graphics.drawable.Icon
import android.media.AudioAttributes
import android.media.RingtoneManager
import android.net.Uri
import android.os.Build

/**
 * The ringing alarm: a high-priority insistent notification (the chosen sound, repeating) with a full-screen intent to
 * AlarmActivity; AlarmRinger plays the vibration. When the phone is in use Android shows it as a heads-up notification
 * instead. «Начать» goes through AlarmActivity (ACTION_START) so the ring stops before the app opens.
 */
object AlarmNotification {
  /** One channel per sound (`study-alarms-<soundId>`): a channel's sound can't change once created. */
  private const val CHANNEL_PREFIX = "study-alarms"
  private const val NOTIFICATION_ID = 7301
  private const val RING_MS = 60_000L

  fun difficultyLabel(difficulty: String) =
    when (difficulty) {
      "medium" -> "Medium"
      "hard" -> "Hard"
      else -> "Easy"
    }

  /**
   * Opens the algorithm's screen (expo-router handles algomaster://algo/<slug>), the «Карточки» tab for a card group
   * (algomaster://cards), or just the app.
   */
  fun openIntent(ctx: Context, item: AlarmStore.Item): Intent {
    val path = if (item.isCards) "cards" else if (item.slug.isNotEmpty()) "algo/${item.slug}" else null
    val intent =
      if (path != null) {
        Intent(Intent.ACTION_VIEW, Uri.parse("algomaster://$path")).setPackage(ctx.packageName)
      } else {
        ctx.packageManager.getLaunchIntentForPackage(ctx.packageName) ?: Intent()
      }
    return intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
  }

  /** Heading, title line and detail line of the alarm for a planned block. */
  fun texts(item: AlarmStore.Item): Triple<String, String, String> {
    val minutes = item.costMs / 60_000L
    return if (item.isCards) {
      Triple("Время повторить карточки", item.title, "~$minutes мин.")
    } else {
      Triple("Время учить алгоритм", item.title, "${difficultyLabel(item.difficulty)} · ~$minutes мин.")
    }
  }

  fun show(ctx: Context, item: AlarmStore.Item) {
    val nm = ctx.getSystemService(NotificationManager::class.java)
    val sound = AlarmStore.sound(ctx)
    val alarmSound = AlarmRinger.soundUri(sound)
    val audio = AlarmRinger.alarmAudio
    val channelId = "$CHANNEL_PREFIX-${AlarmRinger.soundId(sound)}"
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      // Leave a single «Будильники учёбы» channel: drop the ones of other sounds (and older ids).
      nm.notificationChannels
        .filter { it.id != channelId && (it.id == CHANNEL_PREFIX || it.id.startsWith("$CHANNEL_PREFIX-")) }
        .forEach { nm.deleteNotificationChannel(it.id) }
      nm.createNotificationChannel(
        NotificationChannel(channelId, "Будильники учёбы", NotificationManager.IMPORTANCE_HIGH).apply {
          description = "Будильник в начале каждого запланированного алгоритма"
          setSound(alarmSound, audio)
          // AlarmRinger vibrates, so it can repeat the way the settings say.
          enableVibration(false)
          lockscreenVisibility = Notification.VISIBILITY_PUBLIC
        },
      )
    }

    val flags = PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
    val fullScreen = PendingIntent.getActivity(
      ctx,
      10,
      AlarmScheduler.putItem(Intent(ctx, AlarmActivity::class.java), item)
        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_NO_USER_ACTION),
      flags,
    )
    val start = PendingIntent.getActivity(
      ctx,
      11,
      AlarmScheduler.putItem(Intent(ctx, AlarmActivity::class.java).setAction(AlarmActivity.ACTION_START), item)
        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
      flags,
    )
    val snooze = PendingIntent.getBroadcast(
      ctx,
      13,
      AlarmScheduler.putItem(Intent(ctx, AlarmReceiver::class.java).setAction(AlarmReceiver.ACTION_SNOOZE), item),
      flags,
    )
    val later = PendingIntent.getBroadcast(
      ctx,
      12,
      Intent(ctx, AlarmReceiver::class.java).setAction(AlarmReceiver.ACTION_DISMISS),
      flags,
    )

    val (heading, title, detail) = texts(item)
    @Suppress("DEPRECATION")
    val builder =
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) Notification.Builder(ctx, channelId) else Notification.Builder(ctx)
    builder
      .setSmallIcon(smallIcon(ctx))
      .setColor(Color.parseColor("#3B5BDB"))
      .setContentTitle(heading)
      .setContentText("$title · $detail")
      .setCategory(Notification.CATEGORY_ALARM)
      .setVisibility(Notification.VISIBILITY_PUBLIC)
      .setFullScreenIntent(fullScreen, true)
      .setContentIntent(start)
      .setAutoCancel(true)
      .setDeleteIntent(later)
      .addAction(Notification.Action.Builder(null as Icon?, "Начать", start).build())
      .addAction(Notification.Action.Builder(null as Icon?, snoozeLabel(ctx), snooze).build())
      .addAction(Notification.Action.Builder(null as Icon?, "Пропустить", later).build())
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      builder.setTimeoutAfter(RING_MS)
    } else {
      @Suppress("DEPRECATION")
      builder.setPriority(Notification.PRIORITY_MAX).setSound(alarmSound, audio)
    }
    val notification = builder.build()
    // Repeat the sound until the user reacts (or the timeout removes it).
    notification.flags = notification.flags or Notification.FLAG_INSISTENT
    nm.notify(NOTIFICATION_ID, notification)
    val (timings, repeat) = AlarmStore.vibration(ctx)
    AlarmRinger.vibrate(ctx, timings, repeat)
    AlarmRinger.stopLater(ctx, RING_MS)
  }

  /** «Отложить на 10 мин» with the snooze setting. */
  fun snoozeLabel(ctx: Context) = "Отложить на ${AlarmStore.read(ctx).snoozeMinutes} мин"

  fun cancel(ctx: Context) {
    ctx.getSystemService(NotificationManager::class.java).cancel(NOTIFICATION_ID)
  }

  /** The status bar icon generated by the expo-notifications config plugin, or the app icon. */
  private fun smallIcon(ctx: Context): Int {
    val id = ctx.resources.getIdentifier("notification_icon", "drawable", ctx.packageName)
    return if (id != 0) id else ctx.applicationInfo.icon
  }
}

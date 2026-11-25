package expo.modules.studyalarms

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.Ringtone
import android.media.RingtoneManager
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager

/**
 * Sound and vibration of a ringing alarm. The sound comes from the notification channel (one channel per sound, since
 * a channel's sound can't change once created) and repeats via FLAG_INSISTENT; the vibration is played here so it can
 * repeat once, N times, without stopping, or with a pause (the waveform is built in JS: `alarmWaveform`). Everything
 * stops in `stop`, called on every way out (answer, snooze, skip, swipe, the one-minute timeout).
 */
object AlarmRinger {
  const val SOUND_DEFAULT = ""
  const val SOUND_SILENT = "silent"
  private const val REQUEST_STOP = 4
  private const val PREVIEW_MS = 5_000L

  val alarmAudio: AudioAttributes =
    AudioAttributes.Builder()
      .setUsage(AudioAttributes.USAGE_ALARM)
      .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
      .build()

  /** The sound to play for a stored setting; null = silent. */
  fun soundUri(sound: String): Uri? =
    when (sound) {
      SOUND_SILENT -> null
      SOUND_DEFAULT -> defaultAlarmUri()
      else -> Uri.parse(sound)
    }

  private fun defaultAlarmUri(): Uri? =
    RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
      ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)

  /** Part of the channel id for a sound setting. */
  fun soundId(sound: String): String =
    when (sound) {
      SOUND_DEFAULT -> "default"
      SOUND_SILENT -> "silent"
      else -> "u" + Integer.toHexString(sound.hashCode())
    }

  private fun vibrator(ctx: Context): Vibrator =
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      ctx.getSystemService(VibratorManager::class.java).defaultVibrator
    } else {
      @Suppress("DEPRECATION")
      ctx.getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
    }

  /** Starts the alarm vibration (timings alternate wait / vibrate; `repeat` = index to loop from, -1 = no loop). */
  fun vibrate(ctx: Context, timings: LongArray, repeat: Int) {
    if (timings.isEmpty()) return
    val v = vibrator(ctx)
    if (!v.hasVibrator()) return
    val loopFrom = if (repeat in timings.indices) repeat else -1
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      @Suppress("DEPRECATION")
      v.vibrate(VibrationEffect.createWaveform(timings, loopFrom), alarmAudio)
    } else {
      @Suppress("DEPRECATION")
      v.vibrate(timings, loopFrom)
    }
  }

  /** Stops the ring: the notification (and with it the insistent sound), the vibration and the pending timeout. */
  fun stop(ctx: Context) {
    AlarmNotification.cancel(ctx)
    vibrator(ctx).cancel()
    ctx.getSystemService(AlarmManager::class.java).cancel(stopIntent(ctx))
  }

  /** Stops the ring after `afterMs` even if nobody reacts (a heads-up notification has no screen to close it). */
  fun stopLater(ctx: Context, afterMs: Long) {
    val am = ctx.getSystemService(AlarmManager::class.java)
    val at = System.currentTimeMillis() + afterMs
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !am.canScheduleExactAlarms()) {
      am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, stopIntent(ctx))
    } else {
      am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, stopIntent(ctx))
    }
  }

  private fun stopIntent(ctx: Context): PendingIntent =
    PendingIntent.getBroadcast(
      ctx,
      REQUEST_STOP,
      Intent(ctx, AlarmReceiver::class.java).setAction(AlarmReceiver.ACTION_STOP),
      PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
    )

  // ---------- Sound list and preview (Settings) ----------

  /** The phone's alarm sounds, then its ringtones (titles as the system shows them). */
  fun sounds(ctx: Context): List<Map<String, String>> {
    val seen = mutableSetOf<String>()
    val result = mutableListOf<Map<String, String>>()
    for (type in listOf(RingtoneManager.TYPE_ALARM, RingtoneManager.TYPE_RINGTONE)) {
      try {
        val manager = RingtoneManager(ctx).apply { setType(type) }
        val cursor = manager.cursor
        try {
          while (cursor.moveToNext()) {
            val uri = manager.getRingtoneUri(cursor.position)?.toString() ?: continue
            if (!seen.add(uri)) continue
            result.add(mapOf("title" to cursor.getString(RingtoneManager.TITLE_COLUMN_INDEX), "uri" to uri))
          }
        } finally {
          cursor.close()
        }
      } catch (e: Exception) {
        // Some phones restrict the ringtone list (e.g. external sounds without storage access); skip that type.
      }
    }
    return result
  }

  private val handler = Handler(Looper.getMainLooper())
  private var preview: Ringtone? = null

  fun previewSound(ctx: Context, sound: String) {
    stopPreview()
    val uri = soundUri(sound) ?: return
    preview = RingtoneManager.getRingtone(ctx, uri)?.apply {
      audioAttributes = alarmAudio
      play()
    }
    handler.postDelayed({ stopPreview() }, PREVIEW_MS)
  }

  fun stopPreview() {
    handler.removeCallbacksAndMessages(null)
    preview?.stop()
    preview = null
  }
}

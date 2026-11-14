package fr.kana.app;

import android.content.Context;
import android.media.AudioAttributes;
import android.os.Build;
import android.os.VibrationAttributes;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.os.VibratorManager;
import com.getcapacitor.JSArray;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import org.json.JSONException;

/**
 * Vibrations de l'application. navigator.vibrate de la WebView ne vibre pas quand le téléphone est
 * en silencieux (Chromium l'ignore dans ce mode) : on vibre ici comme un retour tactile (USAGE_TOUCH),
 * soumis au réglage « Retour tactile » du système et non au mode sonnerie.
 */
@CapacitorPlugin(name = "KanaHaptics")
public class KanaHapticsPlugin extends Plugin {

    private Vibrator vibrator() {
        Context context = getContext();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            VibratorManager manager = (VibratorManager) context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE);
            return manager != null ? manager.getDefaultVibrator() : null;
        }
        return (Vibrator) context.getSystemService(Context.VIBRATOR_SERVICE);
    }

    @PluginMethod
    public void vibrate(PluginCall call) {
        Vibrator vibrator = vibrator();
        JSArray pattern = call.getArray("pattern");
        if (vibrator == null || !vibrator.hasVibrator() || pattern == null || pattern.length() == 0) {
            call.resolve();
            return;
        }
        try {
            // Motif web (vibration, pause, vibration…) → forme d'onde Android (pause initiale nulle).
            long[] timings = new long[pattern.length() + 1];
            timings[0] = 0;
            for (int i = 0; i < pattern.length(); i++) timings[i + 1] = pattern.getLong(i);
            VibrationEffect effect = VibrationEffect.createWaveform(timings, -1);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                vibrator.vibrate(effect, VibrationAttributes.createForUsage(VibrationAttributes.USAGE_TOUCH));
            } else {
                AudioAttributes attributes = new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_ASSISTANCE_SONIFICATION)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build();
                vibrator.vibrate(effect, attributes);
            }
        } catch (JSONException | RuntimeException e) {
            // Motif invalide ou vibreur indisponible : pas de vibration.
        }
        call.resolve();
    }
}

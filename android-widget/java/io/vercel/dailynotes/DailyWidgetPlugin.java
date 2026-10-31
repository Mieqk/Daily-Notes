package io.vercel.dailynotes;

import android.content.Context;
import android.content.SharedPreferences;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** Мост страницы с виджетом: приложение присылает серию дней и отметку «сегодня записано». */
@CapacitorPlugin(name = "DailyWidget")
public class DailyWidgetPlugin extends Plugin {
    static final String PREFS = "daily_widget";

    @PluginMethod
    public void update(PluginCall call) {
        Integer streak = call.getInt("streak", -1);
        Boolean done = call.getBoolean("done", false);
        String day = call.getString("day", "");
        SharedPreferences.Editor e = getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit();
        e.putInt("streak", streak == null ? -1 : streak);
        e.putBoolean("done", done != null && done);
        e.putString("day", day == null ? "" : day);
        e.apply();
        DailyWidgetProvider.refresh(getContext());
        call.resolve();
    }
}

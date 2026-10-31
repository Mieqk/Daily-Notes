package io.vercel.dailynotes;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.widget.RemoteViews;
import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Date;
import java.util.Locale;

/** Виджет на главный экран: серия дней, отметка за сегодня и кнопки «Записать», «Планы», «Искра». */
public class DailyWidgetProvider extends AppWidgetProvider {

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] ids) {
        for (int id : ids) manager.updateAppWidget(id, build(context));
    }

    /** Перерисовывает все размещённые виджеты (после новых данных из приложения). */
    static void refresh(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        int[] ids = manager.getAppWidgetIds(new ComponentName(context, DailyWidgetProvider.class));
        if (ids.length > 0) {
            RemoteViews views = build(context);
            for (int id : ids) manager.updateAppWidget(id, views);
        }
    }

    private static String iso(Calendar c) {
        return new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date(c.getTimeInMillis()));
    }

    private static RemoteViews build(Context context) {
        SharedPreferences p = context.getSharedPreferences(DailyWidgetPlugin.PREFS, Context.MODE_PRIVATE);
        int streak = p.getInt("streak", -1);
        boolean done = p.getBoolean("done", false);
        String day = p.getString("day", "");
        Calendar c = Calendar.getInstance();
        String today = iso(c);
        c.add(Calendar.DAY_OF_YEAR, -1);
        String yesterday = iso(c);

        RemoteViews v = new RemoteViews(context.getPackageName(), R.layout.widget_daily);
        // Данные старше вчерашнего дня уже неточны: просим открыть приложение
        boolean fresh = streak >= 0 && (day.equals(today) || day.equals(yesterday));
        if (!fresh) {
            v.setTextViewText(R.id.widget_streak, context.getString(R.string.widget_open_app));
            v.setTextViewText(R.id.widget_status, "");
        } else {
            boolean doneToday = done && day.equals(today);
            v.setTextViewText(R.id.widget_streak, context.getString(R.string.widget_streak, streak));
            v.setTextViewText(R.id.widget_status, context.getString(doneToday ? R.string.widget_done : R.string.widget_todo));
        }
        v.setOnClickPendingIntent(R.id.widget_root, open(context, "tab=daily", 0));
        v.setOnClickPendingIntent(R.id.widget_write, open(context, "tab=daily", 1));
        v.setOnClickPendingIntent(R.id.widget_plan, open(context, "tab=plan", 2));
        v.setOnClickPendingIntent(R.id.widget_ai, open(context, "tab=hobby&sub=ai", 3));
        return v;
    }

    private static PendingIntent open(Context context, String query, int code) {
        Intent i = new Intent(Intent.ACTION_VIEW, Uri.parse("io.vercel.dailynotes://open?" + query));
        i.setClass(context, MainActivity.class);
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        return PendingIntent.getActivity(context, code, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }
}

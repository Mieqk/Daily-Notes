package io.vercel.dailynotes;

import android.content.Intent;
import android.health.connect.HealthConnectException;
import android.health.connect.HealthConnectManager;
import android.health.connect.ReadRecordsRequestUsingFilters;
import android.health.connect.ReadRecordsResponse;
import android.health.connect.TimeInstantRangeFilter;
import android.health.connect.datatypes.SleepSessionRecord;
import android.os.Build;
import android.os.OutcomeReceiver;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

/**
 * Чтение сна из Health Connect (только чтение, только сон). Используется системный API Android 14+,
 * где Health Connect встроен в систему; на более старых версиях status() возвращает available=false.
 */
@CapacitorPlugin(
    name = "HealthSleep",
    permissions = { @Permission(alias = "sleep", strings = { "android.permission.health.READ_SLEEP" }) }
)
public class HealthSleepPlugin extends Plugin {
    // Типы фаз сна, считающиеся пробуждением (STAGE_TYPE_AWAKE = 1, STAGE_TYPE_OUT_OF_BED = 3).
    private static final int STAGE_AWAKE = 1;
    private static final int STAGE_OUT_OF_BED = 3;

    private boolean supported() {
        return Build.VERSION.SDK_INT >= 34 && getContext().getSystemService(HealthConnectManager.class) != null;
    }

    private JSObject state() {
        JSObject r = new JSObject();
        boolean ok = supported();
        r.put("available", ok);
        r.put("granted", ok && getPermissionState("sleep") == PermissionState.GRANTED);
        return r;
    }

    @PluginMethod
    public void status(PluginCall call) {
        call.resolve(state());
    }

    @PluginMethod
    public void request(PluginCall call) {
        if (!supported()) {
            call.resolve(state());
            return;
        }
        if (getPermissionState("sleep") == PermissionState.GRANTED) {
            call.resolve(state());
            return;
        }
        requestPermissionForAlias("sleep", call, "sleepPermResult");
    }

    @PermissionCallback
    private void sleepPermResult(PluginCall call) {
        call.resolve(state());
    }

    /** Если системное окно разрешений уже отклонено дважды, открываем настройки Health Connect. */
    @PluginMethod
    public void openSettings(PluginCall call) {
        try {
            Intent i = new Intent("android.health.connect.action.MANAGE_HEALTH_PERMISSIONS");
            i.putExtra(Intent.EXTRA_PACKAGE_NAME, getContext().getPackageName());
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(i);
            call.resolve();
        } catch (Exception e) {
            call.reject("settings unavailable");
        }
    }

    /** Сессии сна за последние days дней: время начала и конца в мс, число пробуждений. */
    @PluginMethod
    public void read(PluginCall call) {
        if (!supported() || getPermissionState("sleep") != PermissionState.GRANTED) {
            call.reject("no access");
            return;
        }
        Integer d = call.getInt("days", 3);
        int days = d == null ? 3 : Math.max(1, Math.min(d, 30));
        Instant end = Instant.now();
        Instant start = end.minus(days, ChronoUnit.DAYS);
        try {
            HealthConnectManager mgr = getContext().getSystemService(HealthConnectManager.class);
            ReadRecordsRequestUsingFilters<SleepSessionRecord> req =
                new ReadRecordsRequestUsingFilters.Builder<>(SleepSessionRecord.class)
                    .setTimeRangeFilter(new TimeInstantRangeFilter.Builder().setStartTime(start).setEndTime(end).build())
                    .build();
            mgr.readRecords(req, getContext().getMainExecutor(), new OutcomeReceiver<ReadRecordsResponse<SleepSessionRecord>, HealthConnectException>() {
                @Override
                public void onResult(ReadRecordsResponse<SleepSessionRecord> resp) {
                    JSArray out = new JSArray();
                    for (SleepSessionRecord rec : resp.getRecords()) {
                        int awake = 0;
                        List<SleepSessionRecord.Stage> stages = rec.getStages();
                        if (stages != null) {
                            for (SleepSessionRecord.Stage s : stages) {
                                int t = s.getType();
                                if (t == STAGE_AWAKE || t == STAGE_OUT_OF_BED) awake++;
                            }
                        }
                        JSObject o = new JSObject();
                        o.put("start", rec.getStartTime().toEpochMilli());
                        o.put("end", rec.getEndTime().toEpochMilli());
                        o.put("awakenings", awake);
                        out.put(o);
                    }
                    JSObject r = new JSObject();
                    r.put("sessions", out);
                    call.resolve(r);
                }

                @Override
                public void onError(HealthConnectException e) {
                    call.reject("read failed");
                }
            });
        } catch (Exception e) {
            call.reject("read failed");
        }
    }
}

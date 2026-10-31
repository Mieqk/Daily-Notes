package io.vercel.dailynotes;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import java.util.regex.Pattern;

public class MainActivity extends BridgeActivity {
    private static final String SITE = "https://daily-notes-io.vercel.app";
    private static final Pattern WORD = Pattern.compile("[a-z]{1,20}");

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(DailyWidgetPlugin.class);
        registerPlugin(HealthSleepPlugin.class);
        super.onCreate(savedInstanceState);
        if (savedInstanceState == null) openFromWidget(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        openFromWidget(intent);
    }

    /** Кнопки виджета открывают io.vercel.dailynotes://open?tab=…: переходим на нужный раздел сайта. */
    private void openFromWidget(Intent intent) {
        Uri d = intent == null ? null : intent.getData();
        if (d == null || !"open".equals(d.getHost()) || getBridge() == null) return;
        StringBuilder url = new StringBuilder(SITE).append("/?");
        String tab = d.getQueryParameter("tab");
        String sub = d.getQueryParameter("sub");
        if (tab == null || !WORD.matcher(tab).matches()) return;
        url.append("tab=").append(tab);
        if (sub != null && WORD.matcher(sub).matches()) url.append("&sub=").append(sub);
        getBridge().getWebView().loadUrl(url.toString());
    }
}

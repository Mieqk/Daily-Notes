"""Добавляет в AndroidManifest.xml ссылку io.vercel.dailynotes://open (кнопки виджета), сам виджет и доступ к сну из Health Connect."""
import sys

p = sys.argv[1]
s = open(p, encoding="utf-8").read()
flt = """
                <intent-filter>
                    <action android:name="android.intent.action.VIEW" />
                    <category android:name="android.intent.category.DEFAULT" />
                    <category android:name="android.intent.category.BROWSABLE" />
                    <data android:scheme="io.vercel.dailynotes" android:host="open" />
                </intent-filter>
            """
receiver = """
        <receiver android:name=".DailyWidgetProvider" android:exported="true" android:label="@string/widget_name">
            <intent-filter>
                <action android:name="android.appwidget.action.APPWIDGET_UPDATE" />
            </intent-filter>
            <meta-data android:name="android.appwidget.provider" android:resource="@xml/daily_widget_info" />
        </receiver>
    """
# Health Connect (Android 14+): разрешение на чтение сна и экран «как используются данные», без которого системное окно разрешений не появится.
health = """
    <uses-permission android:name="android.permission.health.READ_SLEEP" />
    """
alias = """
        <activity-alias android:name="ViewPermissionUsageActivity" android:exported="true"
            android:targetActivity=".MainActivity" android:permission="android.permission.START_VIEW_PERMISSION_USAGE">
            <intent-filter>
                <action android:name="android.intent.action.VIEW_PERMISSION_USAGE" />
                <category android:name="android.intent.category.HEALTH_PERMISSIONS" />
            </intent-filter>
        </activity-alias>
    """
assert "</activity>" in s and "</application>" in s
s = s.replace("</activity>", flt + "</activity>", 1).replace("</application>", receiver + alias + "</application>", 1)
s = s.replace("<application", health + "<application", 1)
open(p, "w", encoding="utf-8").write(s)

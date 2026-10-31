"""Добавляет в AndroidManifest.xml ссылку io.vercel.dailynotes://open (кнопки виджета) и сам виджет."""
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
assert "</activity>" in s and "</application>" in s
s = s.replace("</activity>", flt + "</activity>", 1).replace("</application>", receiver + "</application>", 1)
open(p, "w", encoding="utf-8").write(s)

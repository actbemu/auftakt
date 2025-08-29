/*
【auftakt53_1.js】
*/
/************* 本スクリプトの目的・成果 ***************
クリックサウンドスクリプト対応（Keepメモ参照）
ADモードに実装する

記録↓
2025/08/17 URLパラメータの取得の処理の統一化。検討
2025/08/16 21:07 タッピングアルゴリズム変更（スマホでイベントキャッチしていない？）
2025/08/14 1９:30 タイミング調整周りの詰め
2025/08/14 14:30 変数名の整理
2025/08/13 13:30 細かいバグ潰し
2025/08/13 11:40 初期化ルーチン整理
2025/08/08 20:32　埋め込みコマンドで任意のn連符、またしても一発で実装できた。
2025/08/06 20:26　基本動作、一発で所望の動作確認できた。
--
バグ
Tappingでの移動平均をちゃんと求めていなかった。


マウスドラッグのとき、メイン画面の外でmouseupすると、mousedownが解除されず
ホバリングでもテンポが変わってしまう。→タイマーでmousedownをfalseにする
			

★DEBUG=trueのままだと、ノーマルモードでもスクリプトが再生されてしまうので注意。
常にmousemoveイベント処理が実行される。←仕方がない。余計な処理を実行しないように配慮する。
★クリックスクリプトモードのとき、拍点検出後にその拍点から予約しているために、Click timing をeraly側にすると
拍点の音が鳴らなくなる。
→予約のタイミングを、拍点よりも手前で行う必要がある。予約のタイムスタンプはclickDelayに応じて変化させる必要がある。
拍点検出の他に、予約タイミング検出を付ける必要がある。
この対応を行う際に、将来のスクリプトの開始拍も設定できるようにする。
ボール打ち上げの開始時刻と拍スクリプトの先頭の予約時刻を指定すれば良い。
スクリプトでの予約は、拍点検出というよりも、先頭予約時刻（clickDelayも加味した時刻）のわずかに手前を検出するという考え方にする。

検討事項
・setTempo テンポ変更の反映。次のサウンドの予約開始タイムスタンプの変更も含める。
→実際の発音は、テンポ変更前の予約音の再生が終わってからになる。現行の拍点での予約から前倒しにするだけで良いだろう。

・metroStart()→metroStart(開始拍)
開始拍の指定は良いが、ユーザインタフェースが問題。設定シートでわざわざ設定するのか。
→スクリプトの埋込コマンドで開始拍を指定できるようにする。ex.《b4 1_/_21》 
当面、アウフタクトがあっても、繰り返すときにはアウフタクトも小節内の一つの音価に含まれてしまい区別できなくなるので、あまり関係ないのかもしれない。

*/

//■■■■■■■ 定数・変数宣言、定義 ■■■■■■
//----- グローバル変数の宣言・定義 -----------------
const DEBUG = false;  //デバグ用 主にconsole表示 
var noOfDraw = 0;  //描画カウンタ

//公開URL　　QRコード出力で使用
let BASE_URL = location.protocol + '//' + location.host + location.pathname;
//AndroidでQRコードのコピーができなかったので、マニュアルなどに使うQRコードをPCで作る場合は
//以下を有効にする。
BASE_URL = 'https://actbemu.github.io/auftakt/auftakt53_1.html';

if (DEBUG) console.log(`BASE_URL:${BASE_URL}`);

//----色関連-----------------

//通常モード・共通
const mcBgcol = '#fff6f5'		//メインキャンバス桜色、胡粉色 #fffffc
const beatBgcol = '#250d00';	//拍子エリア背景色　黒檀#250d00

const setBgcol = 'rgb(220,211,178,0.6)';	//設定パネルの背景　砂色#dcd3b2、rgb(220,211,178,0.4)
const beatCol = '#fff5ee';			//;拍数字の色; 砂色#dcd3b2、海貝色#fff5ee
const divDot0Col = '#e7e7eb';	//分割時のドット紫水晶 #e7e7eb
const divDot1Col = '#ee836f';	//分割時のドット珊瑚朱色 #ee836f
//const cntdwn_col = '#b48a76';	//deprecated　カウントダウン数字の色　梅染 うめぞめ#b48a76　　桜鼠
const pieCol = '#e8d3d1';	//待機時パイチャート　桜鼠 さくらねず#e9dfe5、薄桜 #fdeff2
const msgCol = '#e6b422';	//Beat Areaのメッセージ　黄金 #e6b422

const tripletLineCol = '#e6b422';  //３連音符ラインの色
const sixteenthNoteLineCol = '#507ea4';  //16分音符ラインの色

//テンポ表示タイプ別の色
const tempoCol_0 = '#0f2350';  //濃い藍#0f2350 /B用
const tempoCol_1 = '#ec6800';  //人参色

//ADモード
const mcBgcol2 = '#d6e9ca';	//メインキャンバス２　アスパラガスグリーン#dbebc4
//const beatBgcol2 = '#192f60';	  //拍子エリアADモード背景色アイアンブルー#192f60
const beatBgcol2 = '#69821b';	//拍子エリアADモード背景色　#c5c56a　抹茶色

//-----DOMエレメント関連
//パネルの「✕」タップのインベントリスナーなど、インベントリスナー単独で使う場合は、イベントリスナーのところで定義
//基本画面エレメント
const elWrap = document.getElementById('main_wrap');
const elMainTitleBar = document.getElementById('main_title_bar');	//アプリタイトルバー
const cvMain = document.getElementById("myCanvas");	//動指標が動くcanvas
const ctxMain = cvMain.getContext("2d");	//描画用インスタンス
const cvBeat = document.getElementById("beatCanvas");	//拍子表示キャンバス（画面下部）
const ctxBeat = cvBeat.getContext("2d");	//基本画面上のエレメント
const elTempoTxt = document.getElementById('tempo');	//表示テンポ
const elTempoType = document.getElementById('tempo_type');	//表示テンポのタイプ
const elTempoUp = document.getElementById('tempoAdjup');	//↑
const elTempoDown = document.getElementById('tempoAdjdown');	//↓
const elTap = document.getElementById('btnTAP');	//TAPボタン
const elDivTempoList = document.getElementById('divTempoList');	//テンポリストのdivエレメント
const elTempoList = document.getElementById('tempoList');	//テンポリストのエレメント
const elChkLine = document.getElementById('chk_line');	//1/3,1/4ライン表示チェックボックス
const elMsgBox = document.getElementById('msgbox');	//メッセージボックス
const elModeChange = document.getElementById('mode_change_alert');	//設定モード変更時のアラート画面
const elBtnMdSW = document.getElementById('btn_mode_switch');	//モード変更ボタン
const elBtnMdCancel = document.getElementById('btn_mode_cancel');	//キャンセルボタン

//通常モード設定パネル
const elSetting = document.getElementById('setting');	//通常モード設定パネル
const elPreview0 = document.getElementById('preview0');	//通常モード設定パネルpreviewボタン

//●サウンドON/OFF
// name属性が "radiosound" のラジオボタンをすべて取得します。以下同様
const elRadioSound = document.querySelectorAll('input[name="radiosound"][type="radio"]');
//●サウンドタイミング調整
const elRadioTiming = document.querySelectorAll('input[name="radiotiming"][type="radio"]');
//●サウンド分割
const elDsRadio = document.querySelectorAll('input[name="dsradio"][type="radio"]');
//●拍分割
const elDbRadio = document.querySelectorAll('input[name="dbradio"][type="radio"]');
//●待ち時間設定ラジオボタン処理
const elWtRadio = document.querySelectorAll('input[name="waitingtime"][type="radio"]');

//変拍子設定パネル（AD設定パネル）
const elAdSetting = document.getElementById('ad_setting');	//変拍子設定パネル(AD設定パネル)
const elBeatStr = document.getElementById('ex_beat_str');	//拍子構成設定文字列
const elPreview1 = document.getElementById('preview1');	//AD設定パネルpreviewボタン
const elMTRadio = document.querySelectorAll('input[name="motion_type"][type="radio"]');
const elCTRadio = document.querySelectorAll('input[name="click_type"][type="radio"]');
const elCTScript = document.getElementById('cs_str');  //クリックサウンドスクリプト
//Share（QRコード）パネル
const elQRsheet = document.getElementById('QRsheet');	//QRコード出力表示パネル
const el_csBeat = document.getElementById('csBeat');	const el_csTempo = document.getElementById('csTempo');
const el_csBSD = document.getElementById('csBSD');	//Beat Sound Divsion
const el_csBMD = document.getElementById('csBMD');	//Beat Motion Divsion
const el_URL = document.getElementById('URL');
const el_QR = document.getElementById('QR');	//未使用？
const el_dBSD = document.getElementById('dBSD');
const el_dBMD = document.getElementById('dBMD');

//====パラメータ関連============
//基本パラメータ（URL、設定パネルでの設定を反映）とデフォルト値
let beatStr = '1111';	//拍子構成設定文字列
let MM = 96;	//メルツェルのメトロノーム速度
let motionType = 0;	//0:拍子ベース 1:音符ベース（分割振り）
let clickType = 1;	//クリックサウンドの鳴らし方　0:none 1:拍子ベース 2:１/2　3:1/3 4:1/4 (単純拍子のとき)5:音符ベース（変拍子のとき）
//基本パラメータからただちに反映できるパラメータ（動作開始直前に生成）
//拍運動配列４つ makeBeatArray(str,motionType)で作成
let b_upB = [];	//拍運動配列　跳ね上げ拍点
let b_downB = [];	//拍運動配列　着地拍点
let b_timeSpan = [];	//拍運動配列　時間スパン
let b_maxHeight = [];	//拍運動配列　高さ比率

let BPM;	//toBPM(MM)で算出
let isNormalBeat = true;	//単純拍子？makeBeatArrayで設定可能
let tempoType;	//テンポ表示のタイプ（内部的にはMM）
let startBeat_idx = 0;	//開始拍の拍運動配列インデクスmakeBeatArrayで設定可能
let exBeat_idx = 0	//拍運動配列のインデクス
let timeSpan0;
let maxHeight0;
let maxH0;
//==========================
//新旧パラメータ互換性関連
let Beat;	//拍子（単純拍子）URLパラメータ取得のときだけ使う
let clickType0 = clickType;	//クリック音 off→onに戻したときの復帰用
//基本パラメータの保存用配列　idx:0:Normal  1:Advanced
let s_beatStr = [];
let s_MM = [];
let s_motionType = [];
let s_clickType = [];
let s_csScript = [];  //クリックサウンドスクリプト

//動指標関連
let rafBall;	//request animation frameのインスタンス（停止するときに指定するため）
let rafCDC;	//開始待機時のパイチャート表示アニメーションrequest animation frame　　Count Down Chart

// 6.29 ballを翡翠玉のイメージに変更
const ball_image0 = new Image();
ball_image0.src = './images/ball_green.gif';
const ball_image1 = new Image();
ball_image1.src = './images/ball_brown.gif';

//実際に表示する玉の大きさ
const ball_width = 40;
const ball_height = 40;

//各種ステータスフラグ（動作コントロール用）
let isMoving = false;	//動作中かどうか
let isOsc = false;	//オシレータ起動中か
let isNormalMode = true;  //モード切替用

//フラグ
let f_stop = false;	//直後の拍点で停止させるためのフラグ
let f_wakelock = true;	//初回スタート時にWake Lockアクティブにする。
let f_sound = true;	//クリックサウンドON/OFFフラグ
let f_mousedown = false;	//マウススイッチON／タッチスタート
let f_rafCDC = false;	//カウントダウンアニメーション起動中

//タイムスタンプ
let baseTimeStamp;	//[msec]単位
let currentClickTimeStamp;
let upBeatTimeStamp;
let nextClickTimeStamp;
let downBeatTimeStamp;
let ct0;
//カウントダウン開始タイムスタンプ
let intervalID = 0;	//インターバルタイマー、タイムアウトタイマーのID
let beatTick = (bpm)=> 60 * 1000 / bpm;	// bpm単位のテンポから周期を出力[msec]

//パラメータの範囲規定
const minMM = 1;	//最小テンポ
const maxMM = 210;	//最大テンポ
const maxBeat = 6;	//拍子最大値

//基本パラメータのデフォルト
const MM0 = 96;	//デフォルト値
const Beat0 = 4;	//デフォルト値

//テンポ設定用配列（スワイプの範囲）
let aryMM = new Array(10,20,30,35,40,42,44,46,48,50,52,54,56,58,60,63,66,69,72,76,80,84,88,92,96,100,104,108,112,116,120,126,132,138,144,152,160,168,176,184,192,200,208,220,240,260,280,300,320,360,400,450,500);
let aryMM_idx = 0;

let start_wait = 0;	//開始までの待ち時間[msec]

//分割音、分割振り関連
let ndivSound = 1;	//サウンドの分割数（1～４）設定パネルでの設定値
let ndivBeat = 1;	//分割振り（1～３）設定パネルでの設定値
//let divBeat_idx =0;	//一拍内の分割振りインデクス
let isBeatPoint = true;	//分割振りで拍子拍点か否かを判別するため

//タッピングテンポ設定関連
let prevTap = performance.now();	//前回タップの時刻
let nTapAv = 4;	//タッピング移動平均の個数（3～4）
let arrTap = new Array(nTapAv);
let arrTap_idx = 0;

//レイアウト関連（動指標動作範囲など）
let xx0;	//1拍目のx座標
let xpitch;	//拍点のx座標間隔
let xxU, xxD;	//跳ね上げ点と着地点のx座標
let Beat_idx = 0;	//拍位置のインデクス
const divHrate = 0.75	//分割振りの高さ比率(0.6～0.75)

//クリック音 タイミング調整
let ary_clickDelay = new Array(160,120,80,0,-50,-100,-200);	//設定パネル、ラジオボタン設定値割り付け[msec]
let clickDelay_idx = 3;
let clickDelay = 0;	//サウンドタイミング調整用[msec]

//■Click Sound Script クリックサウンドスクリプト関連2025/08/06 15:46
let isCSStr = false;  // Click Sound Scriptモードのフラグ
let csScript = '1111';  //設定スクリプト
let aryCT = [];  //クリックタイミングの配列
let aryCT_idx = 0;  //配列のインデクス
let click_time = 0;  //配列の値(次の音までの間隔、単位音価に対する倍数)
let unit_note_value;  // 単位音価の実時間[msec] ←bpm2msecの値と同じ？
let lastCTTimestamp = 0;  //直前の一括予約の最後の予約時刻

//■■■■■■■ 関数 ■■■■■■

//表示領域の描画===========================================
function resizeCanvas() {
	//const wrapper = document.querySelector('.wrapper');
	const wrapper = document.getElementById('main_wrap');
	//let w = wrapper.clientWidth;    //wrapper.widthでは値が取得できなかった
	//let h = wrapper.clientHeight;
	//if(DEBUG) console.log('wrapper.clientWidth:' + wrapper.clientWidth);

	//window.innerWidth と window.innerHeight で画面の幅と高さを取得
	let w = window.innerWidth;
	let h = window.innerHeight;
	let wpx;
	let hpx;
	if (DEBUG)
		console.log('■ resizeCanvas()　　width: ' + w);

	//const el_my = document.getElementById('myCanvas');

	cvMain.setAttribute('width', w);
	cvMain.setAttribute('height', 0.8 * h);
	//wrapperを上下に8.5:1.5に分ける
	wpx = w + 'px';
	hpx = 0.8 * h + 'px';
	if (DEBUG)
		console.log('   wpx: ' + wpx + '   hpx = ' + hpx);
	cvMain.style.width = wpx;
	cvMain.style.height = hpx;
	//設定パネルとQRコード出力シートの幅を規定
	let wQSheet = wrapper.clientWidth;
	if (wrapper.clientHeight < wrapper.clientWidth)
		wQSheet = wrapper.clientHeight;
	elQRsheet.style.width = (wQSheet - 30) + 'px';

	//const el_beat = document.getElementById('beatCanvas');
	cvBeat.setAttribute('width', w);
	cvBeat.setAttribute('height', 0.2 * h);
	hpx = 0.2 * h + 'px';
	cvBeat.style.width = wpx;
	cvBeat.style.height = hpx;

	if (!isMoving) drawWaiting(0); //  静止状態のときは、最終拍にボールを置く

}

//拍子構成文字列beatsStrから拍運動配列を作成する
//beat_strから１文字ずつ取り出して、分割モード設定状態motiontypeも加味して展開
//拍運動配列のほか、単純拍子か否か（isNormalBeat)、アウフタクト（開始）位置の配列インデクスを設定する。
//テンポ表示も更新する。
function makeBeatArray(beat_str, motion_type) {
	if (DEBUG)
		console.log(`■makeBeatArray`);
	let i;  	//forループ用
	let ch;  	//beat_strから取り出した文字
	let ch0;  	//chが全部同じかチェックするため
	let max0 = 1;
	let idx = 0;	//配列のインデクス
	let Beat_pos = 1;	//拍位置
	isNormalBeat = true;  //仮設定
	//setTempo();
	let subHeightRate = 0.7;	//単純拍子の分割振りの高さの割合
	Beat = beat_str.length;	//拍子
	startBeat_idx = 0;

	//配列の初期化
	b_upB.length = 0;
	b_timeSpan.length = 0;
	b_downB.length = 0;
	b_maxHeight.length = 0;
	//exBeat_idx = 0;  //配列のインデクス
	if (motion_type == 0) {
		//分割モードでない場合、設定文字列の最大周期を求めておく
		for (i = 0; i < beat_str.length; i++) {
			ch = beat_str.charAt(i);
			if (max0 < ch) max0 = ch;
		}
	}
	//拍子指定文字列beat_strとmotonTypeから配列を作り直す。
	for (i = 0; i < beat_str.length; i++) {
		//1文字ずつ取り出す
		ch = beat_str.charAt(i);
		if (i == 0) {
			ch0 = ch;
		} else {
			if (ch != ch0){
				isNormalBeat = false;  //変拍子（単純拍子ではない）
			}
		}
		//分割振りかどうかで場合分け
		if (motion_type > 0) {
			if (DEBUG)　console.log('Note:分割振りの処理　ch:' + ch);
			//取り出した文字の数だけ繰り返し
			for (let j = 0; j < ch; j++) {
				//if (DEBUG)console.log('   j:' + j);
				b_timeSpan[idx] = 1;  //分割振りのときは常に１
				if (j < (ch - 1)) {
					//同じ拍にとどまる
					b_upB[idx] = Beat_pos;
					b_downB[idx] = Beat_pos;
					b_maxHeight[idx] = subHeightRate;
				}
				if (j == (ch - 1)) {
					//次の拍に遷移
					b_upB[idx] = Beat_pos;
					Beat_pos++;
					if (Beat_pos == (beat_str.length + 1)) {
						Beat_pos = 1;
					}
					b_downB[idx] = Beat_pos;
					b_maxHeight[idx] = 1;
				}
				idx++;
			}
		} else {
			if (DEBUG)　console.log('  Beat:分割振りでない');
			//分割振りではない場合→OK
			b_upB[idx] = Beat_pos;
			b_timeSpan[idx] = ch;
			b_maxHeight[idx] = (ch / max0) ** 2;
			Beat_pos++;
			if (Beat_pos == beat_str.length + 1) {
				b_downB[idx] = 1;
				Beat_pos = 1;
			} else {
				b_downB[idx] = Beat_pos;
			}
			idx++;
		}
	}
	//出来上がった配列をスキャンし、アウフタクト位置startBeat_idxを求める
	for (i = 0; i < b_upB.length; i++) {
		if (b_upB[i] == Beat) {
			startBeat_idx = i;
			break;
			//forループ抜ける
		}
	}
	if (DEBUG)　console.log('  アウフタクト位置idx:' + startBeat_idx);
	exBeat_idx = 0;	//配列のサイズが変わってインデクスがサイズよりも大きな値になる可能性があるためリセットしておく。
}

//上記関数のテスト(拍運動配列の内容をコンソール表示)---------------------------------------------------------
function testMakeBeatArray(str, motion_type) {
	makeBeatArray(str, motion_type);
	setTempo();
	console.log(`
★ beat配列の確認
	  設定文字列;　${str}　　配列のサイズ:${b_downB.length} 単純拍子？ ${isNormalBeat}
	  アウフタクト位置: ${startBeat_idx}
■配列の内容`);
	for (let i = 0; i < b_downB.length; i++) {
		//console.log(i  +  '  b_downB:' + b_downB[i] +  '  b_downB:' + b_downB[i]+ '  b_timeSpan:' + b_timeSpan[i]+ 'H:' + b_maxHeight[i]);
		console.log(`${i}:   ${b_upB[i]} → ${b_downB[i]}   時間 ${b_timeSpan[i]}  高さ${b_maxHeight[i]}`);
	}
}

//指定したエレメントの表示・非表示---------------------------------------------
function dispElement(elm, sw) {
	if (sw) {
		elm.style.display = 'block';
		//表示
	} else {
		elm.style.display = 'none';
		//非表示
	}

}

//メッセージエリアにtxtを表示し、msec[msec]秒後に消す-----------------
function dispMsg(txt, msec) {
	//console.log(elMsgBox.textContent);
	elMsgBox.style.color = msgCol;
	elMsgBox.textContent = txt;
	//elMsgBox.style.display = 'block';
	setTimeout( () => {
		//3秒後に消す
		elMsgBox.textContent = '';
	}
	, msec);
}

//currentTime[sec]をDOMHighResTimeStamp[msec]に変換して返す--------------
function currentTimeStamp() {
	return baseTimeStamp + context.currentTime * 1000;
}

//上記とは逆に、DOMHighResTimeStampをcurrentTime形式に変換して返す------------
//次のサウンドの予約に使う
function timeStampToAudioContextTime(time_stamp) {
	return (time_stamp - baseTimeStamp) / 1000;
}


//ラジオボタンのchecked位置を設定する関数------------------------------------
//参考：https://zenn.dev/nordpol/scraps/3a28480361fe45
const setRadioValue = (name, value) => {
	let elems = document.querySelectorAll(`input[name="${name}"]`);
	//console.log('ラジオボタン' + name + 'の変更：' + value);
	for (let elem of elems) {
		// 	console.log('ラジオボタン' + name + 'の値：' + value);
		if (elem.value == value) {
			elem.checked = true;
			//console.log('のボタンをチェック状態に');
			break;
		}
	}
}
;

//テンポ変更↑↓ボタンクリック時の処理--------------------------------------
//MMを変化させたらsetTempo()するだけ。
//setTempoでは動作モード、テンポタイプなどをもとに適切な表示をする。
function tempoUpNormal() {
	if (MM < maxMM) {
		MM++;
	}
	setTempo();
}
function tempoUpLong() {
	if (MM < 185) {
		MM += 5;
	}
	setTempo();
}
function tempoDownNormal() {
	if (MM >= minMM) {
		MM--;
	}
	setTempo();
}
function tempoDownLong() {
	if (MM >= 15) {
		MM -= 5;
	}
	setTempo();
}

//MM値からBPMへの変換-----------------------------------------------
function toBPM(mm) {
	//beatStr中の最大値を乗じたもの
	let n = 1;
	for (let i = 0; i < beatStr.length; i++) {
		if (beatStr.charAt(i) > n)
			n = beatStr.charAt(i);
	}
	return mm * n;
}

function toMM(bpm) {
	//beatStr中の最大値で除したもの
	let n = 1;
	for (let i = 0; i < beatStr.length; i++) {
		if (beatStr.charAt(i) > n)
			n = beatStr.charAt(i);
	}
	return Math.round(bpm / n);
}

//拍子変更と表示

//従来の拍子設定からBeat配列設定文字列を返す--------------------------
//入力：Beat, ndivBeat
//出力：Beat配列設定文字列
const B2BeatStr = (beat, ndiv) => {
	let str = '';
	for (let i = 0; i < beat; i++) {
		str += ndiv;
	}
	return str;
}
//Beatキャンバスクリック時の処理-------------------------------------------
//Normalモード用　拍子を１ずつ変化させ、その都度setBeatをコール
function BeatChange() {
	if (Beat >= maxBeat) {
		Beat = 1;
	} else {
		Beat++;
	}
	setBeat(isNormalMode);
}

//ＡＤ設定シートを表示-----------------------------------------------------
//動作中はPreviewの代わりに[Stop]と表示
function dispADSetting() {
	console.log(`@dispADSetting`);
	let txt = isMoving ? 'Stop' : 'Preview';
	elPreview1.textContent = txt;
	dispElement(elAdSetting, true);
}


//TAPボタンタップの処理（新）----------------------------------------------------
//タップのたびに呼ばれる
function Tapping() {
	let tp1 = performance.now();
	let tp10 = tp1 - prevTap;
	let sum = 0;
	let av = 0;
	//前回より２秒以上離れていたら、配列をクリア
	if(tp10 >= 2000){
		arrTap.length = 0;
		arrTap_idx = 0;
		//arrTap.push(tp10);
		prevTap = tp1;
		//console.log('TAPing 初期化');
		return;
	}
	//前回より２秒に満たないうちのタップは(タンピングとみなし)、tp10を配列末尾に追加pushする。
	arrTap.push(tp10);
	prevTap = tp1;
	//配列のサイズがnTapAvに満たないうちは、配列の全体の平均を求め、BPMを算出する。 
	if(arrTap.length < nTapAv){
		sum = arrTap .reduce(function (acc, cur) {
		  return acc + cur;
		});
		av = sum / arrTap.length;
		//console.log(`△length:${arrTap.length}　　av:${av} `);

	}else{
	//配列のサイズがnTapAv以上の場合は、n番からn+nTapAv-1番までの平均を求める。
		sum = 0;
		for (let i  = arrTap_idx; i  < arrTap_idx + nTapAv; i++){
			sum += arrTap[arrTap_idx];
		}
		av = sum / nTapAv ; 
		arrTap_idx++;
		//console.log(`△△length:${nTapAv}　　av:${av} 　idx:${arrTap_idx}`);

	}
	//BPMに変換してsetTempo
	mm0 = Math.round(60000 / av);  //整数値に
	//console.log(`▼TAP! tp10:${tp10} length:${arrTap.length}  mm0:${mm0}`);
	if(tempoType == 0){
		MM = mm0;
		BPM = toBPM(MM);
	}else{
		BPM = mm0;
		MM = toMM(BPM);
	}
	setTempo();
}

//キャンバススワイプでテンポ増減===================================
let startY = null;
let deltaY = null;
let x0, y0, travel;
//move量
let travel0 = 12;
//move量の判別値
let timer;
//長押し判別タイマー
let f_longtap = false;
//長押し判別フラグ
let isClick = false;
//タッチスタート-----------------------------------------------------------
function mcToucStart(event) {
	event.preventDefault();  //イベントの処理を続けるのを阻止する。
	f_mousedown = true;

	//各種変数の初期化
	startY = event.touches[0].pageY;  //[0]最初のタッチだけを検知する。
	if (DEBUG) console.log('◆スワイプスタート　at　Y=' + startY);
	x0 = event.touches[0].pageX;
	y0 = event.touches[0].pageY;
	travel = 0;
	//フラグリセット
	f_longtap = false;
	isClick = true;
	//現在のMMに相当するaryMM_idxを求めておく
	aryMM_idx = getIndexOfAryMM(MM);
	
	//長押し検出タイマーと処理
	timer = setTimeout( () => {
		//600msec後の処理＝長押ししたときの処理
		if ((travel < travel0) && f_mousedown) {
			//600msec間の累積移動量^2が少ない場合は長押しと判定
			if (DEBUG)  console.log(`touch長押し：設定画面表示  ${isNormalMode?'ノーマルモード':'ADモード'}`);
			//600msecの間にupされていなければlongtapと判定、という意味からすると!f_mouse_upのほうが論理的にわかりやすか。
			f_longtap = true;  //このフラグは不要では？
			f_mousedown = false;
			//設定パネル表示
			if (isNormalMode) {
				//現在のパラメータを設定パネルに反映させる
				setParaNSheet();  //不要かも
				if (DEBUG)  console.log(`Normal設定画面表示　isNormalMode　${isNormalMode}`);
				dispElement(elSetting, true);
			} else {
				//dispElement(elSetting, true);
				if (DEBUG)  console.log(`AD設定画面表示　isNormalMode　${isNormalMode}`);
				//dispElement(elAdSetting, true);
				dispADSetting();
				//dispElement(elAdSetting, true);
			}
		}
	}
	, 600);
}

//マウスDown　　-------------------------------------------------------
function mcMouseDown(event) {
	event.preventDefault();
	//イベントの処理を続けるのを阻止する。
	//現在のMMに相当するaryMM_idxを求めておく
	aryMM_idx = 0;
	while (MM > aryMM[aryMM_idx]) {
		aryMM_idx++;
	}
	//console.log('MM:' + MM + ' index:' + aryMM_idx);
	//console.log('aryMM.length:' + aryMM.length);

	f_mousedown = true;
	startY = event.pageY;
	if (DEBUG)
		console.log('◆MouseDown');
	x0 = event.pageX;
	y0 = event.pageY;
	//長押し検出
	travel = 0;
	//フラグリセット
	f_longtap = false;
	isClick = true;  //mouse_up/touch_end までの間にmoveしなければクリックと判断
				//全くmoveしないというのは条件として厳しい
	timer = setTimeout( () => {
		//停止はclearInterval(timer)
		//600msec間の累積移動量が小さければ長押し
		if (DEBUG)
			console.log(`◆mouse長押し：${isNormalMode ? 'Normal': 'AD'}設定画面表示`);
		if ((travel <= travel0) && f_mousedown == true) {
			//mouseupなどで使うフラグ立てる
			f_longtap = true;
			//モードに応じた設定パネル表示
			f_mousedown = false;
			if (isNormalMode) {
				dispElement(elSetting, true);
			} else {
				dispADSetting();
			}

		}
	}
	, 600);
	//メインキャンバスの外でmouse_upとなった場合の対策
	timer2 = setTimeout( () => {f_mousedown = false;}, 2000);
}

//スワイプ動作時の処理-----------------------------------------------------
function mcMove(event) {
	event.preventDefault();
	if (DEBUG)console.log('◆Move');
	//長押し検出用に移動量積算
	travel = travel + (x0 - event.touches[0].pageX) ** 2 + (y0 - event.touches[0].pageY) ** 2;
	
	//if (travel > travel0) {clearInterval(timer);}//timeout処理のところでやるので不要
	
	//移動量計算起点座標更新
	x0 = event.touches[0].pageX;
	y0 = event.touches[0].pageY;
	//if(DEBUG) console.log('travel:' + travel);

	const delta0 = 20;  //上下方向に動いた距離のしきい値
	const yy = event.touches[0].pageY;
	
	//上下移動量がしきい値未満ならなにもしない
	deltaY = startY - yy;
	if (Math.abs(deltaY) < delta0)  return;

	//テンポ変更処理(配列のインデクスを操作)
	f_longtap = false;
	startY = yy;  //上下移動量起点座標更新
	//クリック音を出す
	const now = context.currentTime;
	gain.gain.setValueAtTime(0.6, now);
	gain.gain.linearRampToValueAtTime(0, now + 0.01);
	//aryMM_idxを1つ増減する
	aryMM_idx = aryMM_idx + 1 * Math.sign(deltaY);
	//idxの範囲に収める
	if (aryMM_idx >= aryMM.length) {
		aryMM_idx = aryMM.length - 1;
		console.log('aryMM_idx上限！');
	}
	if (aryMM_idx < 0)aryMM_idx = 0;

	//MMを設定し、表示する
	MM = aryMM[aryMM_idx];
	//BPM = toBPM(MM);  //setTempoの中で処理する
	setTempo();

	//touchendのときにクリックと判断しないようにフラグを立てる
	isClick = false;
}
//マウスドラッグ時の処理-----------------------------------------------
function mcMouseMove(event) {
	if (DEBUG)console.log('◆mouseMove');
	isClick = false;  //すこしでもmoveしたらクリックとは見做さない。
	if (f_mousedown) {
		//マウスの場合ホバリングでもmoveイベントが発生するので必要
		//長押し検出用に移動量積算
		travel = travel + (x0 - event.pageX) ** 2 + (y0 - event.pageY) ** 2;
		if (travel > travel0) {
			clearInterval(timer);
		}
		x0 = event.pageX;
		y0 = event.pageY;
		//if(DEBUG) console.log('travel:' + travel);

		const delta0 = 20;
		//上下方向に動いた距離のしきい値
		event.preventDefault();
		const yy = event.pageY;
		//移動量がしきい値以内ならなにもしない
		deltaY = startY - yy;
		if (Math.abs(deltaY) < delta0)
			return;
		f_longtap = false;
		//console.log('動いた！' + deltaY);
		startY = yy;
		//クリック音を出す
		const now = context.currentTime;
		gain.gain.setValueAtTime(1, now);
		gain.gain.linearRampToValueAtTime(0, now + 0.01);
		//aryMM_idxを増減する
		aryMM_idx += Math.sign(deltaY);

		if (aryMM_idx >= aryMM.length) {
			aryMM_idx = aryMM.length - 1;
			console.log('aryMM_idx上限！');
		}
		if (aryMM_idx < 0)
			aryMM_idx = 0;
		//MMを設定し、表示する
		MM = aryMM[aryMM_idx];
		//BPM = toBPM(MM);  //setTempoの中で処理する
		setTempo();
	}
}
//タッチ終了時の処理---------------------------------------------------
function mcTouchEnd(event) {
	if (DEBUG) console.log('◆Touch End');
	clearInterval(timer);  //長押し判別タイマー停止
	f_mousedown = false;

	//待機時間カウントダウン中のときはカウントダウン中止する
	if (f_rafCDC) {
		//カウントダウンタイマーを止める
		window.cancelAnimationFrame(rafCDC);
		f_rafCDC = false;
		//ボールを最終拍においてスタンバイ
		drawWaiting(0);
		return;
	}

	if (f_longtap) {
		touch = false;
	} else {
		if(!isClick) return;
		//クリックと判断
		if(isMoving) {
			//Stop ■ストップ操作
			metroStop();
		} else {
			//ボールを最終拍においてスタンバイ
			//let rate = 0;
			//if (start_wait > 0)  rate = 1;
			drawWaiting(start_wait == 0? 0: 1);
			ct0 = performance.now();
			//カウントダウンパイチャート描画タイマー起動
			rafCDC = window.requestAnimationFrame(drawCounDownChart);
			f_rafCDC = true;
		}
	}
}
//マウスup時の処理--------------------------------------------------
function mcMouseUp(event) {
	if (DEBUG) console.log(`◆Mouse Up　travel=${travel} travel0=${travel0} isClick=${isClick}`);
	clearInterval(timer);  //長押し判別タイマー停止
	f_mousedown = false;

	if (f_rafCDC) {
		//カウントダウンタイマーを止める
		window.cancelAnimationFrame(rafCDC);
		f_rafCDC = false;
		//ボールを最終拍においてスタンバイ
		drawWaiting(0);
		return;
	}

	if (f_longtap) {
		touch = false;
	} else {
		if (travel >= 10){ //down中にポインタがズレたときはクリックとはみなさない。
			return;
		}
		//ズレ（travel）が一定以下のときはクリックと判断
		//動作中の場合は停止処理
		if (isMoving) {
			//Stop ■ストップ操作
			if(DEBUG)console.log('→◆◆キャンバスクリック→動作停止！');
			metroStop();
			if (MM < 30) {
				//アニメーション停止
				window.cancelAnimationFrame(rafBall);
				//描画エリアの消去（クリア）
				ctxMain.clearRect(0, 0, cvMain.width, cvMain.height);
				//ボールを最終拍においてスタンバイ
				drawWaiting(0);
				f_mousedown = false;
				var t1 = context.currentTime;
				gain.gain.cancelScheduledValues(t1);
				return;
			}
		//動作中でない場合は開始処理
		} else {
			if(DEBUG)console.log('→◆◆キャンバスクリック→動作開始！');
			drawWaiting(start_wait == 0? 0: 1);
			ct0 = performance.now();
			//パイチャート描画タイマー起動
			rafCDC = window.requestAnimationFrame(drawCounDownChart);
			f_rafCDC = true;
		}
	}
}

//Help表示（[Help]がクリックされたら）----------------------------------------
const btnHelp = document.getElementById("btn_Help");
btnHelp.addEventListener('click', () => {
	//設定パネルを消し、Help表示
	dispElement(elSetting, false);
	drawHelp();
}
);

//QRコード出力処理（[Share]がクリックされたら）------------------------------
const btnShare0 = document.getElementById("btn_share0");
btnShare0.addEventListener('click', dispShareSheet);
const btnShare1 = document.getElementById("btn_share1");
btnShare1.addEventListener('click', dispShareSheet);

function dispShareSheet() {
	//設定パネルを消し、QRコード出力シートを表示
	clearAllSheets();
	dispElement(elQRsheet, true);
	//メトロノームの動作停止
	metroStop();
	if (!navigator.clipboard) {
		dispMsg("'Copy URL' is not available on this bowser.", 3000);
		return;
	}
	//BASE_URLにパラメータを追加
	let txt = BASE_URL + "?mm=" + MM;
	txt += '&exb=' + beatStr;
	//デフォルト値の場合はＵＲＬに含めない
	if (motionType != 0)
		txt += '&mt=' + motionType;
	if (clickType != 1)
		txt += '&ct=' + clickType;
	if (clickDelay_idx != 3) {
		txt += "&bst=" + clickDelay_idx;
	}
	if(clickType ==9){
		txt += "&cs=" + elCTScript.value;
	}
	//touch長押し：設定画面表示
	//出力シート上にQRコード、URLを表示
	document.getElementById('QR').textContent = '';
	//QRコード描画前にエリア内消去
	var qrcode = new QRCode('QR',{
		text: txt,
		width: 128,
		//96よりサイズが小さいと読み取りが不安定になるかも
		height: 128,
		correctLevel: QRCode.CorrectLevel.H
	});

	el_URL.textContent = txt;
}

//放物運動描画と拍点処理======================================
//■Request Animation Frameの際に呼ばれる処理約６０回／秒
function drawMark() {
	//描画エリアの消去（クリア）
	ctxMain.clearRect(0, 0, cvMain.width, cvMain.height);

	let flying_time = beatTick(BPM) * b_timeSpan[exBeat_idx];
	//現在運動の周期（予定飛行時間）[msec] 途中で倍になる？
	flying_time = downBeatTimeStamp - upBeatTimeStamp;
	//これだと正常動作？
	//正規化時刻と座標	
	const t = (currentTimeStamp() - upBeatTimeStamp) / flying_time;
	//★要確認
	const y = -4 * t * (t - 1);
	
	//console.log(x + " " + y);
	let maxH = (cvMain.height - 2.5 * ball_height);  //テンポ表示部分を割り引く
	maxH = maxH * maxHeight0;  //分割拍の高さmaxHeight0

	//if(divBeat_idx > 0){maxH *= divHrate;}  //分割振り対応

	//テンポが速いときの高さ調整
	if (MM > 120) {  	//テンポが早い場合の高さ制限
		maxH = (1 - (MM - 120) / 500) * maxH;
	}

	//maxHをグローバル変数に保存
	maxH0 = maxH;
	//ボールを表示  地平線からのめり込むような場合は表示しない
	if(y>=-0.05){
		drawBall(xxU + t * (xxD - xxU), (cvMain.height - 0.5 * ball_height) - y * maxH);
	}
	noOfDraw++;  //デバグ用描画数カウンタ

	//３連符(0.88888)、１６分音符(0.75)のライン描画
	drawMarkerLines(maxH);

	//■次の描画の予約（お決まりの手続き）
	rafBall = window.requestAnimationFrame(drawMark);

	//CSSクリックサウンドスクリプトの予約処理
	//サウンド予約開始タイムスタンプ
	let rsvTS = downBeatTimeStamp + clickDelay;
	//一括予約呼び出しタイミングマージン[msec]
	const rsvTS_margin = 200;
	//console.log(`    ${rsvTS}  clickDelay:${clickDelay}`);
	if(clickType == 9 && (exBeat_idx == b_upB.length - 1) && (rsvTS - currentTimeStamp()) < rsvTS_margin){
		//console.log(`  ★一括予約タイミングチェック  clickDelay:${clickDelay}  rsvTS:${rsvTS}  rsvTS_margin:${rsvTS_margin}`);
				rsvByCTarray(rsvTS);
	}
	//拍点処理
	//現在時刻が着地点の拍点タイプスタンプの手前8msecを切ったら拍点とみなす
	//if (currentTimeStamp() - downBeatTimeStamp + clickDelay >= -8) {
	//現在時刻が着地点の拍点タイプスタンプ以上になったら拍点とみなす
	if (currentTimeStamp() - downBeatTimeStamp >= 0) {
		//拍点検出
		//拍子拍点か判別
		if (b_maxHeight.length == 1) {
			//１拍子のとき
			isBeatPoint = b_maxHeight[exBeat_idx] == 1 ? true : false;
			//拍子拍点か判別
		} else {
			isBeatPoint = xxU != xxD ? true : false;
			//拍子拍点か判別
		}
		if (DEBUG) console.log(`${isBeatPoint ? '●拍子拍点' : '◯拍点'}  更新前：exBeat_idx=${exBeat_idx}  ${b_upB[exBeat_idx]}→${b_downB[exBeat_idx]}　 時間 ${b_timeSpan[exBeat_idx]}  高さ${b_maxHeight[exBeat_idx]}
		TS:${downBeatTimeStamp}
		`);
		/*
		if(DEBUG) console.log(`　　　${beatTick(BPM) * b_timeSpan[exBeat_idx]}[msec] v.s. ${flying_time}[msec]
		1周期の描画数：${noOfDraw}  停止フラグ ${f_stop}`);
		*/

		//描画回数カウンタリセット（参考程度にカウントしてみただけ）
		noOfDraw = 0;

		if (f_stop && isBeatPoint) {
			//■停止処理
			//ストップ操作直後の拍点で停止Stop
			//アニメーション停止
			window.cancelAnimationFrame(rafBall);
			//予約されたサウンドを停止したいが…
			//osc.stop();
			//gain.gain.value = 0;
			//接続: osc => gain => dest.
			//osc.connect(gain).connect(context.destination);
			//isOsc = false;
			//描画エリアの消去（クリア）
			ctxMain.clearRect(0, 0, cvMain.width, cvMain.height);
			//指標を次の拍点に置いて停止
			drawBall(xxD, cvMain.height - 0.5 * ball_height);
			//1/3,1/4ライン表示
			drawMarkerLines(maxH);
			return;

			//サウンド予約取り消し
			//	console.log('  【サウンド予約取り消し】');
			//gain.gain.cancelScheduledValues(0);  //即座にキャンセルされない、代わりに長い音が出たりする。
		} else {
			//★★本来の拍点処理ここから
			//この拍点が配列の最後の拍点かをチェック
			let isLastBeat = false;
			if(exBeat_idx == (b_upB.length - 1)) isLastBeat = true;  //isLastBeatは未使用か？
			//インデクス更新　インデクス更新はここに移動2025
			exBeat_idx++;
			if (exBeat_idx >= b_upB.length)
				exBeat_idx = 0;

			if (DEBUG)console.log(`　　更新後第${b_upB[exBeat_idx]}拍　インデクス:${exBeat_idx}`);

			//次の跳ね上げで使うパラメータをセット
			xxU = xx0 + (b_upB[exBeat_idx] - 1) * xpitch;
			xxD = xx0 + (b_downB[exBeat_idx] - 1) * xpitch;
			timeSpan0 = b_timeSpan[exBeat_idx];
			maxHeight0 = b_maxHeight[exBeat_idx];

			//拍子拍点直後に次のクリックサウンド予約
			if (isBeatPoint && clickType >=1 && clickType <= 5) {
				//サウンドありの場合
				if (DEBUG)  console.log(`次の着地点のタイムスタンプを計算　クリックサウンド予約`);
				rsvClickUntilNextBeat(downBeatTimeStamp + clickDelay);
			}

			//現在と次の着地点のタイムスタンプを更新
			//rsvClickUntilNextBeat内での処理とかぶるものがある
			let time_to_next_beat = isNormalBeat ? beatTick(MM) : beatTick(BPM) * b_timeSpan[exBeat_idx];
						if (DEBUG)console.log(`    次の着地点まで${time_to_next_beat}[msec]`);
			currentClickTimeStamp = nextClickTimeStamp;
			//nextClickTimeStamp += beatTick(BPM)*b_timeSpan[exBeat_idx];
			nextClickTimeStamp += beatTick(BPM);

			upBeatTimeStamp = downBeatTimeStamp;

			//downBeatTimeStamp += beatTick(BPM)*b_timeSpan[exBeat_idx];
			if (motionType == 0) {
				//Beat
				downBeatTimeStamp += time_to_next_beat;
			} else {
				//Note
				downBeatTimeStamp += beatTick(BPM);
			}
		}
	}
}
// end of  drawMark

//次の拍子拍点と途中の分割音や音符クリック音のサウンドを予約=================
//currentTS：現在の拍子拍点のタイムスタンプ[msec]
//変拍子設定文字列の１に相当するテンポbpmを確実に規定しておくことが必要
function rsvClickUntilNextBeat(currentTS) {
	//次の拍子拍点のタイムスタンプを求める
	//単純拍子の場合テンポ設定値MMにもとづく
	//変拍子の場合は音符テンポに拍運動配列のb_timeSpanを乗じたものに
	let time_to_next_beat;
	//次の拍子拍点のタイムスタンプ
	BPM = toBPM(MM);
	//拍単位Beatの場合
	if (motionType == 0)
		time_to_next_beat = isNormalBeat ? beatTick(MM) : beatTick(BPM) * b_timeSpan[exBeat_idx];
	//音符単位の場合
	if (motionType == 1) {
		//beatStrで並べられた数値から求める
		let c = beatStr.charAt(b_upB[exBeat_idx] - 1);
		time_to_next_beat = c * beatTick(BPM);
		if (DEBUG)
			console.log(`${beatStr}拍位置：${b_upB[exBeat_idx]} 長さ：${c}`);
	}

	if (DEBUG)console.log(`
	@rsvClickUntilNextBeat:	MM = ${MM} BPM = ${BPM}
	isNormalBeat? ${isNormalBeat} b_timeSpan:${b_timeSpan[exBeat_idx]}
	TS0:${currentClickTimeStamp}`);

	//次の拍子拍点サウンドを予約　クリック音はsound_type:0
	if (DEBUG) console.log(`@ rsvClickUntilNextBeatで次の拍子拍点予約　　${time_to_next_beat}[msec]後`);
	rsvClickSound(0, currentTS + time_to_next_beat);

	//次の拍子拍点までに分割音がある場合は分割音sound_type:1も予約
	//clickTypeが、2,3,4の場合それぞれその値で分割
	if (clickType >= 2 && clickType <= 4) {
		for (let i = 1; i < clickType; i++) {
			if (DEBUG) console.log(`　　Beat分割音（${i}）予約　　${time_to_next_beat / clickType}[msec]後`);
			rsvClickSound(1, currentTS + i * time_to_next_beat / clickType);
		}
	}
	//clickTypeが5の場合（noteベースのbpmテンポで
	if (clickType == 5) {
		let dr = beatTick(toBPM(MM))
		let ts = currentTS + dr;
		if (DEBUG) console.log(`*clickType 5 の場合：次の拍子拍点${time_to_next_beat}[msec]後`);
		while (ts < (currentTS + time_to_next_beat)) {
			rsvClickSound(1, ts);
			if (DEBUG) console.log(`   Noteベースclick予約　　${ts}[msec]後`);
			ts += dr;
		}
	}
}

//メトロノームのON/OFF　開始/停止---------------------------------------------
//★将来的には、引数で開始拍位置を指定できるようにする。
//→クリックサウンドスクリプトで、アウフタクトから始まるのに対応するため。
function metroStart() {
	elPreview0.textContent = 'Stop';
	elPreview1.textContent = 'Stop';
	//初回タップ時の1回のみオシレータ開始、基準タイムスタンプ取得
	if (!isOsc) {
		//オシレータ開始（この段階で音量は０）
		//ユーザ操作の後にスタートさせる必要があるのでここに置いた。
		osc.start();
		isOsc = true;
		//オシレータ開始時のタイムスタンプを基準baseTimeStampとする
		baseTimeStamp = performance.now() - context.currentTime * 1000;
	}
	//初回タップ時のみWake Lock起動
	if (f_wakelock && isSupported) {
		requestWakeLock();
		dispMsg('Screen Wake Lock enabled. The screen will stay on.', 3000);
		f_wakelock = false;
	}
	makeBeatArray(beatStr, motionType);  //不要かも
	setTempo();
	if (DEBUG) {
		//testMakeBeatArray(beatStr, motionType);
		//デバグ用
		console.log(`■metroStart■`);
		showCurrentParm();
	}
	//タイムスタンプ処理
	//現在時刻を拍点時刻にする
	currentClickTimeStamp = currentTimeStamp();
	upBeatTimeStamp = currentTimeStamp();

	//テンポリストボックス表示を消す
	elDivTempoList.style.display = 'none';

	//アニメーション
	//ボールを初期位置に置く
	exBeat_idx = startBeat_idx;
	xxU = xx0 + (b_upB[exBeat_idx] - 1) * xpitch;
	//跳ね上げ点
	xxD = xx0 + (b_downB[exBeat_idx] - 1) * xpitch;
	//着地点
	timeSpan0 = b_timeSpan[exBeat_idx];
	maxHeight0 = b_maxHeight[exBeat_idx];
	drawBall(xxU, cvMain.height - 0.5 * ball_height);

	//次の拍点時刻でサウンド予約★変拍子のときは要検討
	//開始時は、最初の拍子拍点（1拍目）の予約だけで良い
	//(b_timeSpanは分割振りのときはすべて１となるのでここでは使えない)

	//次の"拍子拍点"のタイムスタンプ
	BPM = toBPM(MM);
	nextClickTimeStamp = currentClickTimeStamp + beatTick(BPM) * beatStr.charAt(b_upB[exBeat_idx] - 1);
	//拍子拍点クリック音予約
	if (clickType > 0 && clickType <= 5) rsvClickSound(0, nextClickTimeStamp + clickDelay);
	
	//CSSクリックサウンドスクリプト対応(clickTypeが9のとき)
	if(clickType == 9){
		//スクリプトをテキストボックスから読み取って★配列作成★
		//配列作成するのはこのmetrostartのタイミングだけ。
		//let cs_String = elCTScript.value;
		if(DEBUG) console.log(`クリックスクリプト :《${elCTScript.value}》`)
		makeClickTimingArray(beatStr, elCTScript.value);
		//aryCTに基づいて一括サウンド予約
		rsvByCTarray(nextClickTimeStamp + clickDelay);
	}
	
	//次の着地点のタイムスタンプ
	downBeatTimeStamp = upBeatTimeStamp + beatTick(BPM) * b_timeSpan[exBeat_idx];
	//デバグ用どこかでmotion用にnextClickTimeStampを使っているかも

	//アニメーションタイマー起動
	rafBall = window.requestAnimationFrame(drawMark);
	isMoving = true;
	f_stop = false;

	if (DEBUG) {
		console.log(`■■Start■■(${isNormalMode?'Normal' : 'AD'} mode)【${beatStr}】
		clickType=${clickType}
		exBeat_idx=${exBeat_idx}  ${b_upB[exBeat_idx]}→${b_downB[exBeat_idx]}　 時間 ${b_timeSpan[exBeat_idx]}  高さ${b_maxHeight[exBeat_idx]}
		`);
	}

}

//動作 Stop------------------------------------------------------
function metroStop() {
	isMoving = false;
	//フラグを立てて次の拍点で停止させる
	f_stop = true;
	//設定シートのPreviewボタン表示
	elPreview0.textContent = 'Preview';
	elPreview1.textContent = 'Preview';
	dispMsg('Halting...', 1000);
	if (DEBUG) console.log('停止フラグ：' + f_stop);
}

//サウンド予約=============================================
//   soundtype:サウンドの種類 1のとき分割音
//   timestamp:鳴らす時刻タイムスタンプ[msec]
function rsvClickSound(soundtype, timestamp) {
	let gain0 = soundtype == 0? 1: 0.5;
	let len = soundtype == 0?0.03: 0.03 / 2;
	//音の減衰長さ
	//分割音（soundtypeが1のとき）のパラメータ調整
	/*
	if (soundtype == 1) {
		gain0 = 0.5;
		len *= 0.5
	}
	*/
	
	const next_click_time = timeStampToAudioContextTime(timestamp);
	//console.log(`@rsvClickSound   for ${next_click_time}sec (timestamp=${timestamp}) `);
	gain.gain.setValueAtTime(gain0, next_click_time);
	gain.gain.linearRampToValueAtTime(0, next_click_time + len);
}

//指定したDOM要素を長押しかどうかを判別して指定した関数に振り分ける=====================
//参考：https://mo2nabe.com/long-press/
function long_press(el, nf, lf, sec) {
	let longclick = false;
	let longtap = false;
	let touch = false;
	let timer;
	el.addEventListener('touchstart', () => {
		touch = true;
		longtap = false;
		timer = setTimeout( () => {
			longtap = true;
			lf();
		}
		, sec);
	}
	)
	el.addEventListener('touchend', () => {
		if (!longtap) {
			clearTimeout(timer);
			nf();
		} else {
			touch = false;
		}
	}
	)

	el.addEventListener('mousedown', () => {
		if (touch) return;
		longclick = false;
		timer = setTimeout( () => {
			longclick = true;
			lf();
		}
		, sec);
	}
	)

	el.addEventListener('click', () => {
		if (touch) {
			touch = false;
			return;
		}
		if (!longclick) {
			clearTimeout(timer);
			nf();
		}
	}
	);
}  //function long_press

//開始待機カウントダウン処理-------------------------------------------
//   アウフタクトにボールを置いて、rateに相当するパイチャートを描画
//   タイムアウトでメトロノーム動作開始
function drawCounDownChart() {
	const now = performance.now();
	const time0 = now - ct0;
	//開始からの経過時間[msec];
	//残り時間の割合を計算
	let rate = 0;
	if (start_wait > 0)
		rate = (start_wait - time0) / start_wait;

	//console.log('描画タイマー起動中　rate:' + rate);
	drawWaiting(rate);

	if (rate < 0.001) {
		//動作開始
		//タイマー破棄
		window.cancelAnimationFrame(rafCDC);
		f_rafCDC = false;
		if (DEBUG)
			console.log('待機パイチャート表示タイマー破棄　rafCDC:' + rafCDC);
		metroStart();
	} else {
		//次の描画の予約
		rafCDC = window.requestAnimationFrame(drawCounDownChart);
		f_rafCDC = true;
	}
}

//開始待機画面描画-------------------------------------------------------
//アウフタクトにボールを置いて、rate(0 - 1)に相当するグラフを描画
//rafCDC割込みで呼ばれる
//rate[pieの面積]を0にすると、単にアウフタクト（最終拍）にボールを置く関数として使える。
//1/3,1/4ライン表示も行う
function drawWaiting(rate) {
	if(DEBUG) console.log('パイチャートアニメ表示■drawWaiting()');
	//ボールを最終拍においてスタンバイ
	//キャンバス内全面クリア
	ctxMain.clearRect(0, 0, cvMain.width, cvMain.height);

	//ボールを最終拍に
	drawBall(xx0 + (Beat - 1) * xpitch, cvMain.height - 0.5 * ball_height);

	//３連符(0.88888)、１６分音符(0.75)のライン描画
	//let maxH = cvMain.height - 2.5 * ball_height; //maxHが決まらない場合
	drawMarkerLines(maxH0);
	
	//パイチャート描画
	if (rate > 0.01) {
		startAngle = 1.5 * Math.PI;
		const angle = rate * 2 * Math.PI;
		let radius = cvMain.width / 6;

		if (cvMain.height < cvMain.width) {
			radius = cvMain.height / 6
		}
		;ctxMain.beginPath();
		ctxMain.moveTo(cvMain.width / 2, cvMain.height / 2);
		// 円の中心キャンバスの中央
		ctxMain.arc(cvMain.width / 2, cvMain.height / 2, radius, startAngle, startAngle - angle, true);
		ctxMain.fillStyle = pieCol;
		ctxMain.fill();
	}

}

//起動時、設定画面のHELPタップ時に、画面上にヘルプを重ね書きする。------------------
function drawHelp() {
	const txt_color = '#8f8667';
	//鬱金色 うこんいろ#fabf14 黒檀 こくたん#250d00
	const line_color = '#8f8667';
	//#8f8667 利休色
	var str = '';
	var xx, yy;
	ctxMain.font = "13pt sans-serif";
	ctxMain.fillStyle = txt_color;
	ctxMain.strokeStyle = line_color;
	ctxMain.lineWidth = 1;

	//テンポ関連
	str = 'Tap Number to select Tempo.';
	ctxMain.fillText(str, 10, 120);
	//矢印線書く、角度は45度から20度に変えて鋭い矢印に
	aline(ctxMain, 20, 104, 30, 40, 20, 14);

	str = 'Tempo up / down';
	ctxMain.fillText(str, 100, 100);
	aline(ctxMain, 130, 88, 0.7 * cvMain.width, 53, 20, 14);

	str = 'Tapping';
	ctxMain.fillText(str, 200, 80);
	aline(ctxMain, 220, 66, 0.95 * cvMain.width, 38, 20, 14);

	//画面中央タップとスワイプ（センタリング）
	ctxMain.textAlign = "center";
	xx = 0.5 * cvMain.width;
	str = 'Swipe upward/downward';
	yy = 0.5 * cvMain.height - 40;
	ctxMain.fillText(str, xx, yy);
	str = 'to change Tempo.';
	yy = 0.5 * cvMain.height - 20;
	ctxMain.fillText(str, xx, yy);

	str = 'Tap to Start/ Stop.';
	const offset_y = 30;
	yy = 0.5 * cvMain.height + 30;
	ctxMain.fillText(str, xx, yy + offset_y);
	str = 'LongTap for setting.';
	yy += 20;
	ctxMain.fillText(str, xx, yy + offset_y);
	//破線の円setLineDash() メソッドで点線のパターンを指定
	ctxMain.setLineDash([2, 2]);
	ctxMain.beginPath();
	ctxMain.arc(0.5 * cvMain.width, 0.5 * cvMain.height + offset_y, 13, 0, Math.PI * 2, true);
	ctxMain.closePath();
	ctxMain.strokeStyle = line_color;
	ctxMain.stroke();
	ctxMain.setLineDash([]);
	//dashを解除
	//破線の円に向けた矢印
	aline(ctxMain, 0.5 * cvMain.width - 30, 0.5 * cvMain.height + 20 + offset_y, 0.5 * cvMain.width - 4, 0.5 * cvMain.height + 4 + offset_y, 20, 14);

	//拍子
	str = 'Tap Beat Area to Change Beat.';
	yy = cvMain.height - 60;
	ctxMain.fillText(str, xx, yy);
	str = 'Long Tap to Change Mode.';
	ctxMain.fillText(str, xx, yy + 18);
	aline(ctxMain, xx, yy + 20, xx, yy + 50, 20, 14);

	//↕　上・下スワイプはunicode矢印
	ctxMain.font = "30pt sans-serif"
	ctxMain.fillText('↕', 0.5 * cvMain.width - 50, 0.5 * cvMain.height + 15);
	//矢印線書く
	aline(ctxMain, 0.5 * cvMain.width - 26, 0.5 * cvMain.height - 20, 0.5 * cvMain.width - 40, 0.5 * cvMain.height, 20, 14);
}

//矢印線を描く--------------------------------------------------------
//( 描画するキャンバス, 始点x, 始点y, 終点x, 終点y, 矢印線角度, 矢印線長さ )
//https://webnation.co.jp/javascriptでcanvasで三角関数で矢印線を書く/
function aline(ctx, x1, y1, x2, y2, r, len) {
	//元の線
	ctx.beginPath();
	ctx.moveTo(x1, y1);
	ctx.lineTo(x2, y2);
	ctx.stroke();

	//元の線の角度
	var rad = Math.atan2(y2 - y1, x2 - x1);
	//矢印線の角度
	var radA = r * Math.PI / 180;

	//矢印線1
	ctx.beginPath();
	ctx.moveTo(x2, y2);
	ctx.lineTo(x2 - len * Math.cos(rad + radA), y2 - len * Math.sin(rad + radA));
	ctx.stroke();

	//矢印線2
	ctx.beginPath();
	ctx.moveTo(x2, y2);
	ctx.lineTo(x2 - len * Math.cos(rad - radA), y2 - len * Math.sin(rad - radA));
	ctx.stroke();
}

//xx,yyを中心にした玉の描画----------------------------------------------
function drawBall(xx, yy) {
	//console.log('ボール画像描画');
	//xx=0;
	//yy=0;
	const ballImage = isNormalMode? ball_image0 : ball_image1;//モードによってボール画像を変える
	
	ctxMain.drawImage(ballImage, xx - 0.5 * ball_width, yy - 0.5 * ball_height, ball_width, ball_height);
}

//指定した色で直線を描く-------------------------------------------------
function drawLine(xx0, yy0, xx1, yy1, col){
	ctxMain.strokeStyle = col;
	ctxMain.beginPath();
	ctxMain.moveTo(xx0, yy0);
	ctxMain.lineTo(xx1, yy1);
	ctxMain.stroke();
}

//動指標のマーカー線を描く：３連符(0.88888)、１６分音符(0.75)のライン描画------------
function drawMarkerLines(max_height) {
	if(isNormalMode && motionType == 0 && elChkLine.checked){
		const lineH3 = 0.8888 * max_height;
		const lineH16 = 0.75 * max_height;
		ctxMain.font = "8pt sans-serif";
		//drawLineを使って線を引く(ボール上端が触れるタイミング)
		//1/3
		let yl = cvMain.height - ball_height - lineH3;
		drawLine(0, yl, cvMain.width, yl, tripletLineCol);
		ctxMain.fillStyle = tripletLineCol;
		ctxMain.fillText('1/3', 10, yl + 12);
		//1/4
		yl = cvMain.height - ball_height - lineH16;
		drawLine(0, yl, cvMain.width, yl, sixteenthNoteLineCol);
		ctxMain.fillStyle = sixteenthNoteLineCol;
		ctxMain.fillText('1/4', 10, yl + 12);
		yl = cvMain.height - ball_height - max_height;  //頂点
		drawLine(0, yl, cvMain.width, yl, sixteenthNoteLineCol);
		ctxMain.fillText('1/2', 10, yl + 12);
		//yl = cvMain.height - ball_height;  //着地点
		//drawLine(0, yl, cvMain.width, yl, sixteenthNoteLineCol);
	}
}


//パラメータ確認用
//現在の基本パラメータを表示--------------------------------------------------
//入力：タイトルメッセージ（例：初期化すべて終了後のパラメータ）
function showCurrentParm(txt) {
	console.log(`
■■${txt}■■
*****【現在のパラメータ（グローバル変数）】*****(${isNormalMode? 'Normal' : 'AD'}モード)
	beatStr = [${beatStr}];  ${isNormalBeat ? '単純拍子' : '変拍子'};
	MM = ${MM}; BPM=${BPM}
	motionType = ${motionType};${motionType == 0 ? '拍ベース' : '音符ベース'};
	clickType = ${clickType};
****************************
■Pull 用配列のパラメータ
----Normal Mode----
	MM:${s_MM[0]} beatStr:【${s_beatStr[0]}】
	motionType:${s_motionType[0]}
	clickType:${s_motionType[1]}
	csScript:《${s_csScript[0]}》
----AD Mode----
	MM:${s_MM[1]} beatStr:【${s_beatStr[1]}】
	motionType:${s_motionType[1]}
	clickType:${s_motionType[1]}
	csScript:《${s_csScript[1]}》
	
`)
	
}

//拍子エリアタップの処理----------------------------------------------------
function clickCvBeat() {
	if (DEBUG)console.log(`◆cvBeat clicked ${isNormalMode?'ノーマルモード':'ADモード'}`);
	if(isNormalMode){
		//Noramlモード：これまでどおり
		BeatChange();
	}else{
		setParaADSheet();
		//Advanced設定パネル表示
		//dispADSetting();
		dispElement(elAdSetting, true);
		return;
	}

}
//拍子エリア　ロングタップの処理----------------------------------------------
//モード変更
function l_clickCvBeat() {
	let str = isNormalMode? 'Switch to Advanced Mode' : 'Switch to Normal Mode';
	if (DEBUG)
		console.log(`!cvBeat long clicked
	   Normal mode:${isNormalMode} ${str}`);
	elBtnMdSW.textContent = str;
	dispElement(elModeChange, true);
}

//シートをすべて非表示に（メインキャンバスの表示）-------------------------------
function clearAllSheets() {
	//各種設定パネル、リストボックスを非表示に
	dispElement(elModeChange, false);
	//設定モード変更前のアラート画面
	dispElement(elSetting, false);
	//従来型設定パネル
	dispElement(elAdSetting, false);
	//Advanced設定パネル
	dispElement(elQRsheet, false);
	//ＱＲコード出力パネル
	dispElement(elDivTempoList, false);
	//リストボックス
}


//現在のパラメータを設定画面に反映させる------------------------------------------------
//ノーマルモード
function setParaNSheet() {

	//Click Sound
	const s = clickType > 0 ? 1 : 0;
	setRadioValue("radiosound", s);
	//
	if (clickType > 0 && clickType < 5)
		setRadioValue("dsradio", clickType);
	if (isNormalBeat) {
		let n = beatStr.charAt(0);
		if (n > 0 && n < 4)
			setRadioValue("dbradio", n);
	}
	//Previewボタンの機能名を設定
	let txt = isMoving ? 'Stop' : 'Preview';
	elPreview0.textContent = txt;
}

//現在のパラメータを設定画面に反映させる---------------------------------------
//ADモード
function setParaADSheet() {
	//現在のパラメータをAD設定画面に反映させる。
	elBeatStr.value = beatStr;
	setRadioValue("motion_type", motionType);
	setRadioValue("click_type", clickType);
	//Previewボタンの機能名を設定
	let txt = isMoving ? 'Stop' : 'Preview';
	elPreview1.textContent = txt;
}

//AD設定シートからパラメータ読み取り-----------------------------------------------
function getParaAD() {  //未使用
	beatStr = elBeatStr.value;
}

//現在のパラメータを保存---------------------------------------------------------
function pushPara(idx) {
	s_beatStr[idx] = beatStr;
	s_MM[idx] = MM;
	s_motionType[idx] = motionType;
	s_clickType[idx] = clickType;
	s_csScript[idx] = csScript;
}
//保存されていたパラメータを取り出す------------------------------------------------
function pullPara(idx) {
	beatStr = s_beatStr[idx];
	MM = s_MM[idx];
	motionType = s_motionType[idx];
	clickType = s_clickType[idx];
	f_sound = clickType == 0 ? false : true;
	csScript = s_csScript[idx];
}
//Normal, Advancedそれぞれの現在のパラメータを一時保存、取り出しを行う------------------
//モード切替時にpush, pullする
//実行後、パラメータ変数にはidxで指定した方のパラメータが取り出される。もう片方は配列に保存される
function pushpullPara(idx) {
	if (idx == 0) {
		//Advancedのパラメータを一時保存
		pushPara(1);
		//Normalのパラメータに変更
		pullPara(0);
	}
	if (idx == 1) {
		//Normalパラメータを一時保存
		pushPara(0);
		//Advancedのパラメータに変更
		pullPara(1);
	}
	//実行後のパラメータを見てみる
	if (DEBUG) {
		console.log(`@pushpullPara(${idx}実行後のパラメータを見てみる)`)
		showCurrentParm();
	}
}

//デフォルトパラメータを保存用配列変数に格納----------------------------------------
//モード変更時のパラメータ設定のためのもの
function setDefaultPara() {
	let m;
	//ノーマルモード
	m = 0;
	s_beatStr[m] = '1111';
	s_MM[m] = 96;
	s_motionType[m] = 0;
	s_clickType[m] = 1;
	s_csScript[m] = '';  //実際にはノーマルモードでは使わない
	//ADモード
	m = 1;
	s_beatStr[m] = '332';
	s_MM[m] = 60;
	s_motionType[m] = 0;
	s_clickType[m] = 1;
	s_csScript[m] = '';  //実際にはノーマルモードでは使わない
}
//URLパラメータの取得-----------------------------------
//入力 new URL(window.location.href)
//処理　パラメータをグローバル変数と、対応するモードのPULL用配列に格納
// isNormalMode、isNormalBeatを設定
function getURLPara(url) {
	// URLSearchParamsオブジェクトを取得
	let url_params = url.searchParams;
	//getメソッドでURLからパラメータを抽出
	//拍子（１～6）
	let str_beat = url_params.get('bt');
	//メトロノームテンポ(10～209)
	let str_mm = url_params.get('mm');
	//拍子構成文字列(1～3)
	let str_ex_beat = url_params.get('exb');
	//以下は０も含むもの
	//サウンドON/OFF(0/1)
	let str_bs = url_params.get('bs');
	//サウンドタイミング調整(0～6)7段階
	let str_bst = url_params.get('bst');
	//待ち時間(0,1,2)
	let str_waiting = url_params.get('wt');
	//動きのタイプ(0,1)
	let str_motion_type = url_params.get('mt');
	//クリックサウンドの鳴らし方(0～5, 9)
	let str_click_type = url_params.get('ct');
	//クリックサウンドスクリプト
	let str_cs = url_params.get('cs');
	
	//取得した文字列からパラメータに落とし込む
	//置き換えのパターン、数字以外は削除（''に置き換える）
	const pattern = "[^0-9]/g";
	
	//拍子
	if (str_beat){
		Beat = parseInt(str_beat.replace(pattern, ''));
		if(Beat > 0 && Beat <= 6){
			Beat = Beat0;
		}
		beatStr = B2BeatStr(Beat, 1);
	}
	//テンポ
	if (str_mm) {
		MM = parseInt(str_mm.replace(pattern, ''));
		if(MM){ BPM = toBPM(MM);}
		else{
			MM = MM0;
			BPM = toBPM(MM);
		}
	}

	//クリックサウンドON/OFF(非推奨)
	let fl;
	if (str_bs){
		if (parseInt(str_bs.replace(pattern, '')) == 1) {
			f_sound = true;
			fl = 1;
			clickType = ndivSound;
		} else {
			f_sound = false;
			fl = 0;
			clickType = 0;
		}
		//設定パネルのラジオボタンchckedに反映
		console.log(`*****clickType=${clickType}`);
		setRadioValue("radiosound", fl);
	}
	//サウンドタイミング
	if (str_bst) {
		//ndivSoundが指定されていないときはデフォルト値
		fl = parseInt(str_bst);
		//範囲外のときは、時間差０に設定
		if (fl < 0 || fl > 6)fl = 3;
		//clickDelay = ary_clickDelay[fl] / 1000;
		clickDelay = ary_clickDelay[fl];
		clickDelay_idx = fl;
	}else{
		fl = 3;
	}
	//設定パネルのラジオボタンchckedに反映
	setRadioValue("radiotiming", fl);

	//待ち時間
	if (str_waiting){
		start_wait = parseInt(str_waiting.replace(pattern, '0'));
		if (start_wait > 2)
			start_wait = 2;
	}else{
		start_wait = 0;
	}
	//設定パネルのラジオボタンchckedに反映
	setRadioValue("waitingtime", start_wait);

	//動きのタイプ
	if (str_motion_type) {
		//motion_typeが指定されていないときはデフォルト値
		motionType = parseInt(str_motion_type.replace(pattern, ''));
		if (motionType > 1) motionType = 1;
	}
	//設定パネルのラジオボタンchckedに反映
	setRadioValue("motion_type", motionType);
	
	//クリックサウンドの鳴らし方
	if (str_click_type){
		clickType = parseInt(str_click_type.replace(pattern, '0'));
		clickType = clickType <= 5? clickType: 5;
		//設定パネルのラジオボタンchckedに反映
		setRadioValue("click_type", clickType);
	}

	
	//拍子構成文字列str_ex_beat
	if (str_ex_beat) {
		//let check_result = str_ex_beat.match(/^[1-9]+$/);
		//1-9以外の文字が混じっていたら処理しない
		if (str_ex_beat.match(/^[1-9]+$/)) {
			if (DEBUG) console.log(`URL指定の拍子構成文字列【${str_ex_beat}】`);
			beatStr = str_ex_beat;
			//設定パネルのテキストボックスに反映
			elBeatStr.value = str_ex_beat;
			//このパラメータが指定されていたら必ずADモードで起動
			isNormalMode = false;
		}
	}
	
	//クリックサウンドスクリプト
	//このパラメータが指定されていたら必ずスクリプトモードにする
	//すなわち、clickType = 9;isNormalMode = false;
	if(str_cs){
		if(DEBUG){console.log(`《${str_cs}》`)}
		str_cs = str_cs.replace(/[^0-9 \(\)\{\}\[\]\/\.\_]/g,'');
		clickType = 9;
		isNormalMode = false;
		csScript = str_cs;
		elCTScript.value = str_cs;
	}
		
	f_sound = clickType > 0 ? true : false;

	//対応するモードのPULL用配列に格納
	pushPara(isNormalMode? 0: 1);
	if (DEBUG) {
		showCurrentParm('URL取得後パラメータ');
	}
}

//モードに応じて背景色などを設定----------------------------------
//openSettingSheetから呼ばれる
function setTheme() {
	//メイン画面背景
	let bgcol = isNormalMode ? mcBgcol : mcBgcol2;
	cvMain.style.backgroundColor = bgcol;
	//拍子エリア背景
	bgcol = isNormalMode ? beatBgcol : beatBgcol2;
	cvBeat.style.backgroundColor = bgcol;
	//拍子エリアセット
	drawExBeat(beatStr, clickType);
	//タイトルバーと枠線の色
	elWrap.style.borderWidth = '2px';
	elWrap.style.borderColor = bgcol;
	elMainTitleBar.style.backgroundColor = bgcol;
	elMainTitleBar.textContent = isNormalMode?'Auftakt5--Normal Mode':'Auftakt5--Advanced Mode';

	//待機状態表示
	drawWaiting(0);
}

//画面のテンポ表示、リストボックスなどの選択状態を更新する-----------------------------------
//テンポ表示更新時はかならずこの関数を使う。
//Normalモード時は常にMM、tempo_textは表示せず
//ADモード時は両方のtempoTypeに対応
//ここでは指定されたtempoTypeに応じた表示と
//リストボックス、スワイプ用配列のインデクス設定を行う
//MMとＢＰＭはつねにセットで現在値を保持していることが前提（基本はＭＭ）
//TAPボタン表示の制御もここで行う。
function setTempo() {
	if(DEBUG) console.log(`■setTempo MM=${MM} BPM=${BPM} type ${tempoType == 0?'/B':'/N'}`);
	let tempo_value;  //ここで扱うテンポの値
	let tempo_idx = 0;  //テンポインデクスをここで扱うため
	const fl = isNormalBeat? true: false;  //TAPボタン表示制御用
	//テンポ表示の変更
	if (isNormalMode) {		//ノーマルモードの場合MM一択
		tempo_value = MM;
		elTempoTxt.textContent = tempo_value;
		elTempoTxt.style.color = tempoCol_0;
		elTempoType.textContent = '';  //「/B」は表示しない
		elTempoUp.style.color = tempoCol_0;
		elTempoDown.style.color = tempoCol_0;
		elTap.style.color = tempoCol_0;
		dispElement(elTap, true);  //TAPボタンは必ず表示
		
	} else {							//ADモードの場合
		if(tempoType == 0){	//MM
			tempo_value = MM;
			elTempoTxt.style.color = tempoCol_0;
			elTempoTxt.textContent = tempo_value;
			elTempoType.style.color = tempoCol_0;
			elTempoType.textContent = '/B';	//Beat
			elTempoUp.style.color = tempoCol_0;
			elTempoDown.style.color = tempoCol_0;
			elTap.style.color = tempoCol_0;
		}else{	//BPM
			tempo_value = toBPM(MM);
			BPM = tempo_value;
			elTempoTxt.style.color = tempoCol_1;
			elTempoTxt.textContent = tempo_value;
			elTempoType.style.color = tempoCol_1;
			elTempoType.textContent = '/N';	//Note
			elTempoUp.style.color = tempoCol_1;
			elTempoDown.style.color = tempoCol_1;
			elTap.style.color = tempoCol_1;
		}
		//TAPボタンの表示/非表示
		if(DEBUG) console.log(`@setTempo TAPボタン ${isNormalBeat?'表示':'非表示'}`);
		if(isNormalBeat){
			//elTap.style.display = 'table-cell';
			dispElement(elTap, true);
		}else{
			dispElement(elTap, false);
		}
	}
	//スワイプ用配列のインデクス、現在のMMに相当するaryMM_idxを求めておく
	let i;
	for(i = 0; i < aryMM.length - 1; i++){
		if(aryMM[i] >= MM) break;
	}
	aryMM_idx = i;
	
	if (DEBUG) console.log(`     ****aryMM_idx=${aryMM_idx}→テンポ${aryMM[aryMM_idx]}`);

	//リストボックスの内容を変更し選択状態を変える（将来的な対応）
	//tempoType=1のとき、オリジナルのリスト配列のMM値を
	//toBPM(MM)の値に変えてリストボックスに登録
}

//拍子変更時の処理セットNormalモード用---------------------------------------
//従来の拍子設定からBeat配列設定文字列を作成、拍運動配列を作成し、拍子エリア表示も行う
function setBeat(is_normal_mode) {
	let str = beatStr;
	if (is_normal_mode){
		beatStr = B2BeatStr(Beat, ndivBeat);
		//旧パラメータ使わなければ不要
		//f_divmode = ndivBeat > 1? true: false;
		motionType = ndivBeat > 1 ? 1 : 0;
		if (DEBUG) console.log(`＠setBeat 拍子変更→【${str}】 分割振り(音符種別):${ndivBeat}`);
	}
	makeBeatArray(beatStr, motionType);
	pushPara(is_normal_mode?  0: 1);
	drawExBeat(beatStr, clickType);
	//将来的に引数をmotionTypeとclickTypeに変更したい
	//if(DEBUG) console.log('　　　　　　　Beat:'+Beat);
}
//拍子エリアの描画、拍子数字と分割マーク表示＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝
//------------------------------------
//■■拍子エリア表示、小節構成文字列（拍設定文字列）対応バージョン
//入力：小節構成文字列、サウンド分割数（クリックタイプ）
//取り出した数値に応じてドットを表示する
//------------------------------------
function drawExBeat(str, clicktype) {
	//拍子エリアに数字を置く
	let str_len = str.length;  //設定文字列桁数（拍点の数）
	//拍子エリアの背景色
	let bgcol = isNormalMode ? beatBgcol: beatBgcol2 ;
	cvBeat.style.backgroundColor = bgcol;
	let top_margin = 7;
	//拍数字の上余白
	ctxBeat.textBaseline = "top";
	//文字の左上を座標とする
	ctxBeat.font = "bold 30px sans-serif";
	ctxBeat.fillStyle = beatCol;
	ctxBeat.strokeStyle = beatCol;
	xpitch = cvBeat.width / str_len;
	//文字の大きさを動的に変える
	if (Beat > 6)
		ctxBeat.font = "bold 26px sans-serif";
	if (Beat > 9)
		ctxBeat.font = "bold 22px sans-serif";

	//拍子エリアに数字を置く
	xx0 = xpitch / 2;
	//0.5拍目の位置
	let y0 = top_margin;
	ctxBeat.clearRect(0, 0, cvBeat.width, cvBeat.height);
	//描画エリアの消去
	let x = xx0;
	let marksize = 3;
	for (let i = 0; i < str_len; i++) {
		if (DEBUG) {
			//お試しで着地点に三角マークを置いてみる
			//console.debug(str + ":x=" + x);
			//ctxBeat.fillRect(x, y0+15, 1, 10);  //チェック用マークを置く
			//console.debug("y0="+y0);
			ctxBeat.beginPath();
			ctxBeat.moveTo(x - marksize, 0);
			ctxBeat.lineTo(x, 2 * marksize);
			ctxBeat.lineTo(x + marksize, 0);
			ctxBeat.lineTo(x - marksize, 0);
			ctxBeat.closePath();
			ctxBeat.fill();
			ctxBeat.stroke();
		}
		//７拍子以上の場合は数字を間引きしたい
		//７拍子8拍子:1357
		//９拍子:１４７または１３５７９
		//１０拍子１３５７９
		//１１，１２拍子1357911または14710
		//それ以上　１５９１３あるいは●
		//剰余 (%)を使えばよい
		let dv = str_len > 16 ? 5 : str_len > 12 ? 4 : str_len > 8 ? 3 : str_len > 6 ? 2 : 1;

		if (((i) % dv) == 0) {
			let B_str = (i + 1).toString().trim();
			//拍点番号
			ctxBeat.fillText(B_str, x - 0.5 * ctxBeat.measureText(B_str).width, y0);
		}
		x += xpitch;
	}

	//分割サウンド設定（かつサウンドOＮ）の場合は、拍数字の中間に分割を示すドットを入れる。
	//ただし最終拍の後には入れない。例：１・２・３・４　　１・・２・・３　など
	ctxBeat.font = "bold 22pt sans-serif";
	ctxBeat.fillStyle = divDot0Col;
	x = xx0;
	if (f_sound == true && (clicktype >= 2 && clicktype <= 4)) {
		for (let bt = 0; bt < str.length - 1; bt++) {
			for (let i = 1; i < clicktype; i++) {
				x = xx0 + bt * xpitch + i * xpitch / clicktype;
				ctxBeat.fillText('・', x - 0.5 * ctxBeat.measureText('・').width, y0);
			}
		}
	}

	//分割振りの表記　分割振りの場合は拍数字の下に縦にドット表示
	ctxBeat.font = "bold 22pt sans-serif";
	ctxBeat.fillStyle = divDot1Col;
	x = xx0;
	for (let bt = 0; bt < str.length; bt++) {
		for (let i = 1; i < str.charAt(bt); i++) {
			x = xx0 + bt * xpitch;
			y = y0 + i * 10 + 9;
			ctxBeat.fillText('・', x - 0.5 * ctxBeat.measureText('・').width, y);
		}
	}
}


//入力されたテンポに相当する配列のインデクスを返す
function getIndexOfAryMM(bpm){
	let idx = 0;
		for(idx = 0; idx < aryMM.length - 1; idx++){
		if(aryMM[idx] >= bpm) break;
	}
	return idx;
}
//該当するモードの設定シートを開く----------------------------------------
//モード変更ボタンが押されたときの処理
function openSettingSheet() {
	setTheme();
	clearAllSheets();
	//パラメータを取り出してシートに反映
	if (isNormalMode) {
		pullPara(0)
		setParaNSheet();
	} else {
		pullPara(1);
		setParaADSheet();
	}

	//該当するモードの設定シート表示
	dispElement(isNormalMode ? elSetting : elAdSetting, true);
}

//PCか否かを判定する----------------------------------------------------
//参考：https://www.site-convert.com/archives/2188
let isPC;  //値は'load'のあとに決まる
function chkIfPC() {
  if (navigator.userAgent.match(/iPhone|Android.+Mobile/)) {
    return false;  //PCではない
  } else {
    return true;  //PC
  }
}

//クリックサウンドスクリプトからタイミング配列を作る------------------
//入力：beatStr, clickSoundStr
//返り値なし、aryCT配列が作成される。
function makeClickTimingArray(beatStr, clickSoundStr) {
	let idx = 0;
	let ch;  //取り出した文字
	let nv = 1;  //積算単位音価
	let acc = 0;  //音価アキュムレータ
	let aryV = [];  //n連符のn保存用
	//正規表現の置き換えで、空白、/（スラッシュ）を除去
	const pattern = /[ _\/]/g;
	let csString = clickSoundStr.replace(pattern, '');
	if(DEBUG) console.log(`『${clickSoundStr}』→『${csString}』`)  //OK!
	//配列の初期化
	aryCT.length = 0;
	//1文字ずつ取り出し
	for(let i = 0; i < csString.length; i++){
		ch = csString.charAt(i);
		if(ch == '('){nv = nv / 2;}
		else if(ch == ')'){nv = nv * 2;}
		else if(ch == '['){nv = nv / 3;}
		else if(ch == ']'){nv = nv * 3;}
		else if(ch == '0'){  //0のときは時刻アキュムレータの更新のみ（下記）
			//音価アキュムレータ  += 積算単位音価
			acc += nv;
		}
		else if(ch >= 1 && ch <= 9 ){
			//現在の時刻アキュムレータの値を配列データに追加
			aryCT[idx] = acc;
			idx++;
			acc += nv * ch;
		}
		else if(ch == '{'){
			if(DEBUG)console.log(`「{」検出　i=${i}`);
			i++;
			ch = '';
			while (csString.charAt(i) != '.') {
				if(DEBUG)console.log(`   i=${i} ch=${csString.charAt(i)}`);
				ch += csString.charAt(i++);
			}
			if(DEBUG)console.log(`${ch}連符　i=${i}`);
			nv = nv / ch;
			aryV.push(ch);
		}
		else if(ch == '}'){
			nv = nv * aryV.pop();  //音価を元に戻す
		}
	}
	return;
}

//クリックサウンドスクリプトによる一括予約------------------------------
//入力　予約の先頭タイムスタンプ（通常１拍目のタイムスタンプ）
//この時点のテンポが反映される
function rsvByCTarray(timestamp) {
	//重複予約を避けるための措置
	if(timestamp < lastCTTimestamp)return;
	
	if(DEBUG) console.log('@rsvByCTarray aryCTに基づいて一括サウンド予約');
	let unit_dr = beatTick(BPM);  //現在の単位音価のテンポ
	for(let i = 0; i < aryCT.length;i++){
		if(DEBUG) console.log(`${i}:${timestamp + aryCT[i] * unit_dr}`);
		rsvClickSound(1, timestamp + aryCT[i] * unit_dr);
	}
	//一番最後の予約時刻
	lastCTTimestamp = timestamp + aryCT[aryCT.length - 1] * unit_dr;
	if(DEBUG) console.log(`lastCTTimestamp:${lastCTTimestamp}`);
}


//■■■■■■■ 初期化コード ■■■■■■■■■■■■■■■■■■
// PCかそれ以外かの判定
isPC = chkIfPC();  //PCかスマホかの判定
//画面サイズ確定
resizeCanvas();

//**********Wake Lock関連　*******************
//参考https://github.com/mdn/dom-examples/blob/main/screen-wake-lock-api/script.js
// test support
let isSupported = false;

if ('wakeLock'in navigator) {
	isSupported = true;
	dispMsg('Screen Wake Lock API supported', 3000);
} else {
	dispMsg('Wake lock is not supported by this browser.', 3000);
}

let requestWakeLock = null;
let wakeLock = null;

// create a reference for the wake lock
if (isSupported) {
	console.log('const requestWakeLock()');
	// create an async function to request a wake lock
	requestWakeLock = async () => {
		try {
			wakeLock = await navigator.wakeLock.request('screen');
			dispMsg('<< Wake Lock is active.>>', 3000);
			// listen for our release event
			wakeLock.onrelease = function(ev) {
				console.log(ev);
			}
			wakeLock.addEventListener('release', () => {
				// if wake lock is released alter the button accordingly
				//changeUI('released');
				dispMsg('** Wake Lock is released. **', 3000);
			}
			);

		} catch (err) {
			// if wake lock request fails - usually system related, such as battery
			//wakeButton.dataset.status = 'off';
			//wakeButton.textContent = 'Turn Wake Lock ON';
			//statusElem.textContent = `${err.name}, ${err.message}`;
			dispMsg('Wake Lock request failed.', 3000);
		}
	}
}
//他のアプリなどから戻って再表示されたときの処理
const handleVisibilityChange = () => {
	if (wakeLock !== null && document.visibilityState === 'visible') {
		requestWakeLock();
	}
}
//--- wakeLock関連ここまで------------------------------

//*******パラメータ設定*******************
//デフォルトモード、パラメータの設定
//両モードのデフォルトパラメータの設定
setDefaultPara();  //モード切替用push,pull配列に入れる
//デフォルトはノーマルモード
isNormalMode = true;
pullPara(0);  //ノーマルモードのデフォルト値をpullしてグローバル変数にセット
isNormalBeat = true;
BPM = toBPM(MM);


//URLパラメータの取得
// URLを取得
let url = new URL(window.location.href);
getURLPara(new URL(window.location.href));

makeBeatArray(beatStr, motionType);

//*********動作画面セットアップ******************
//パラメータを設定シートに反映
if(isNormalMode){
	setParaNSheet();
}else{
	setParaADSheet();
}
//画面テーマ（背景色）
setTheme();
//設定パネル非表示
clearAllSheets();
//ヘルプ表示 （ノーマルモードのみ） 
if(isNormalMode) drawHelp();
//テンポ設定
setTempo();
//拍子エリア表示
drawExBeat(beatStr, clickType);

showCurrentParm('初期化  画面セットアップの直後');

//---DOM関連------------------
//背景色設定
cvMain.style.color = mcBgcol;
cvBeat.style.color = beatBgcol;
//設定パネルの背景色設定
elSetting.style.backgroundColor = setBgcol;

//*********サウンドオシレータ起動******************
const context = new AudioContext();
const osc = context.createOscillator();
const gain = context.createGain();
// 1200Hz: 敢えてドレミの音階から外れた周波数（参考サイトより）
osc.frequency.value = 1200;
// 最初は音を消しておく
gain.gain.value = 0;
//接続: osc => gain => dest.
osc.connect(gain).connect(context.destination);
//実際のオシレータ開始osc.startは、画面タップStart時1回のみ。
//発音はgainでコントロールするため、ブラウザを閉じるまで発振し続ける。

//*********ボールを最終拍においてスタンバイ**********
drawWaiting(0);

//-----------《初期化コード　その１　ここまで》------

//■■■■■■■■■イベントリスナー関連■■■■■■■■■■■
//メインキャンバスのイベントリスナーの設定**********************************
//cvMain.addEventListener('touchstart', mcToucStart);
cvMain.addEventListener('mousedown', mcMouseDown);
//cvMain.addEventListener('touchmove', mcMove);
cvMain.addEventListener('mousemove', mcMouseMove);
cvMain.addEventListener('mouseup', mcMouseUp);
//処理をmcMouseUpと同じにした
//cvMain.addEventListener('touchend', mcMouseUp);
//タッピングボタン
//elTap.addEventListener('click', Tapping);
//elTap.addEventListener('touchstart', Tapping);

//isPC = chkIfPC();  //PCかスマホかの判定
//isPC = true;  //判定がうまくいかないので強制的にPCにするときは、コメントを外す。
if(chkIfPC()){
	//PC用イベントリスナー
	//メインキャンバス
	cvMain.addEventListener('mousedown', mcMouseDown);
	cvMain.addEventListener('mousemove', mcMouseMove);
	cvMain.addEventListener('mouseup', mcMouseUp);
	//タッピング
	//elTap.addEventListener('pointerdown', Tapping);
	elTap.addEventListener('mousedown', Tapping);


}else{
	//スマホ、タブレット用イベントリスナー
	//メインキャンバス
	cvMain.addEventListener('touchstart', mcToucStart);
	cvMain.addEventListener('touchmove', mcMove);
	cvMain.addEventListener('touchend', mcMouseUp);
	//タッピング
	elTap.addEventListener('touchstart', Tapping);

}
//----テンポUP/Downボタンをタップ/長押ししたときの処理
long_press(elTempoUp, tempoUpNormal, tempoUpLong, 500);
long_press(elTempoDown, tempoDownNormal, tempoDownLong, 500);

//テンポ表示部(数字)をタップしたときの処理
elTempoTxt.addEventListener('click', function(e) {
	dispElement(elDivTempoList, true);
	//リストボックス表示
});

//テンポリスト変更時の処理
elDivTempoList.addEventListener('change', function(e) {
	let mm = elTempoList.value;
	MM = Number(mm);
	//BPM = toBPM(MM);  //setTempoの中で処理する
	setTempo();
	dispElement(elDivTempoList, false);
});



//拍子エリアのイベントリスナーの設定***************************************
long_press(cvBeat, clickCvBeat, l_clickCvBeat, 600);

//各種シートタイトルバーの[✕]ボタンクリック時の処理**************************
//設定パネルの[Close]ボタン処理
document.getElementById('btn_close_setting').addEventListener('click', function(e) {
	dispElement(elSetting, false);
});
//AD設定パネルの[✕]ボタン処理
document.getElementById('btn_close_ex').addEventListener('click', function(e) {
	//elSetting.style.display = 'none';
	dispElement(elAdSetting, false);
});
//モード変更アラートパネルの[Close]ボタン処理
document.getElementById('btn_mChange_close').addEventListener('click', function(e) {
	dispElement(elModeChange, false);
});
//QRコード出力シート[Close]ボタン処理
document.getElementById('btn_close_QR').addEventListener('click', function(e) {
	dispElement(elQRsheet, false);
});

//★モードチェンジボタンが押されたとき**************************************
//isNormalModeを変更。対応する設定シート表示
elBtnMdSW.addEventListener('click', function(e) {
	dispElement(elModeChange, false);
	//アラート画面OFF
	//モードステータスを切り替え
	isNormalMode = !isNormalMode;
	if (DEBUG) console.log(`**${isNormalMode? 'Normal' : 'Advanced'}モードに切り替え**更新後のisNormalMode:${isNormalMode} `);
	//現在のパラメータを保存、切り替え先のパラメータにセット
	let i = isNormalMode ? 0 : 1;
	pushpullPara(i);
	aryMM_idx = getIndexOfAryMM(MM);
	makeBeatArray(beatStr, motionType);
	drawExBeat(beatStr, clickType);
	setTempo();
	//タイトルバーと枠線の色（拍子エリアと同色）
	const col = isNormalMode? beatBgcol: beatBgcol2;
	elMainTitleBar.style.backgroundColor = col;
	if (DEBUG) console.log(`Normal 【${s_beatStr[0]}】  Advanced 【${s_beatStr[1]}】　current【${beatStr}】 isNormalBeat ${isNormalBeat}`);
	//該当するモードのカラーに変更して設定シートを開く
	openSettingSheet()
	//マークラインのチェックボックス表示コントロール
	elChkLine.style.display = isNormalMode?'inline':'none';
});

//モード変更アラートでキャンセルボタンが押されたとき
//何もせず、アラート画面を閉じる
elBtnMdCancel.addEventListener('click', function(e) {
	dispElement(elModeChange, false);
});

//その他のリスナー***************************************************
//ウィンドウリサイズ後のレイアウト関連パラメータ更新
window.addEventListener('resize', function() {
	resizeCanvas();
	drawExBeat(beatStr, motionType);
});

//リロード禁止
window.addEventListener("beforeunload", function(event) {
	event.preventDefault();
	// event.returnValue = "リロード禁止です！";
});

//他のタブ、アプリに画面が変わったどうかのリスナー
document.addEventListener('visibilitychange', handleVisibilityChange);





//設定パネル関連*************************************************************************
//Normal設定パネルのラジオボタン、イベントリスナー処理*************************************
//Previewボタン
elPreview0.addEventListener('click', function(e) {
	if (isMoving) {
		metroStop();
	} else {
		metroStart();
	}
});

//●サウンドON/OFF
//各ラジオボタンにイベントリスナーを設定(以下同様)
elRadioSound.forEach(function(radioButton) {
	radioButton.addEventListener('change', function() {
		// 選択されているラジオボタンの値を取得します
		// this.checked は、イベントが発生したラジオボタンがチェックされているかを示します
		if (this.checked) {
			if (this.value == 0) {
				f_sound = false;
				clickType = 0;
			} else {
				f_sound = true;
				if (clickType0 != 0)
					clickType = clickType0;
			}
			//setBeat(isNormalMode);
		}
	});
});

//●サウンドタイミング調整
elRadioTiming.forEach(function(radioButton) {
	radioButton.addEventListener('change', function() {
		// 選択されているラジオボタンの値を取得
		// this.checked は、イベントが発生したラジオボタンがチェックされているかを示す
		if (this.checked) {
			clickDelay_idx = this.value;
			clickDelay = ary_clickDelay[clickDelay_idx];
			if(DEBUG)console.log(`   radio button changed   clickDelay:${clickDelay}`);
		}
	});
});
//

//●サウンド分割
// 各ラジオボタンにイベントリスナーを設定します
elDsRadio.forEach(function(radioButton) {
	radioButton.addEventListener('change', function() {
		// 選択されているラジオボタンの値を取得します
		// this.checked は、イベントが発生したラジオボタンがチェックされているかを示します
		if (this.checked) {
			ndivSound = this.value;
			if (f_sound) {
				clickType = this.value;
				//clickTypeを書き換えて直ちに音を出す
			}
			clickType0 = this.value
			//setBeat(isNormalMode);
			drawExBeat(beatStr, clickType);
		}
	});
});

//●分割振り（motionType）
// 各ラジオボタンにイベントリスナーを設定します
elDbRadio.forEach(function(radioButton) {
	radioButton.addEventListener('change', function() {
		// 選択されているラジオボタンの値を取得します
		// this.checked は、イベントが発生したラジオボタンがチェックされているかを示します
		if (this.checked) {
			ndivBeat = this.value;
			motionType = this.value == 1 ? 0 : 1;
			if (DEBUG)
				console.log('●拍分割ndivBeat:' + ndivBeat);
			setBeat(isNormalMode);
		}
	});
});

//待ち時間設定ラジオボタン処理
// 各ラジオボタンにイベントリスナーを設定します
elWtRadio.forEach(function(radioButton) {
	radioButton.addEventListener('change', function() {
		// 選択されているラジオボタンの値を取得します
		// this.checked は、イベントが発生したラジオボタンがチェックされているかを示します
		if (this.checked) {
			start_wait = this.value;
			console.log('start_wait:' + start_wait);
		}
	});
});

//AD設定パネル***************************************************************
//変拍子設定シートの[Preview]ボタン操作

elPreview1.addEventListener('click', function(e) {
	if (isMoving) {
		metroStop();
	} else {
		metroStart();
	}
});

//●beatStrのテキストボックス入力操作
elBeatStr.addEventListener('input', function(e) {
	//テキストボックスに入力があるたび(1文字ごと)に呼び出される。
	const input_str = elBeatStr.value;
	//input_strのチェック
	let check_result = input_str.match(/^[1-9]+$/);
	if (DEBUG)
		console.log(`入力文字列【${input_str}】 check:${check_result}`);
	if (!check_result) {
		if (DEBUG)
			console.log('NG');
		metroStop();
	} else {
		if (DEBUG)
			console.log('OK');
		//パラメータ変更
		beatStr = input_str;
		setBeat(isNormalMode);
		//変拍子判定
		makeBeatArray(beatStr, motionType);  //この中で変拍子判定
		//TAPボタン表示制御
		//const fl = isNormalBeat? true: false;
		//dispElement(elTap, fl);
	}
});

//●motionTypeの選択
elMTRadio.forEach(function(radioButton) {
	radioButton.addEventListener('change', function() {
		if (this.checked) {
			motionType = this.value;
		}
		setBeat(isNormalMode);
	});
});
//●clickTypeの選択
elCTRadio.forEach(function(radioButton) {
	radioButton.addEventListener('change', function() {
		if (this.checked) {
			clickType = this.value;
		}
		setBeat(isNormalMode);
	});
});

//モード変更アラート画面のCancelボタン操作
elBtnMdCancel.addEventListener('click', function(e) {
	dispElement(elModeChange, false);
	//アラート画面OFF
});

//-----QRコードをクリップボードにコピー
//PCではＯＫ
//Pixel 7proではＮＧか？
/*
document.getElementById('btn_copy_QR').addEventListener('click', function(e) {
	console.log('CopyQR button clicked!!');
	const elQRimg = document.querySelector('div img');
	//CSSのセレクターで目的のimgタグエレメントを取得
	const canvas = document.createElement('canvas');
	canvas.width = elQRimg.naturalWidth;
	canvas.height = elQRimg.naturalHeight;
	const ctx = canvas.getContext('2d');
	ctx.drawImage(elQRimg, 0, 0);

	// Canvas から Blob オブジェクトを生成
	canvas.toBlob(async (blob) => {
		// 画像データをクリップボードに書き込む
		const item = new ClipboardItem({
			'image/png': blob
		});
		await navigator.clipboard.write([item]);
		dispMsg('QR Code successfully Copied', 3000);
	}
	);
});
*/

//参考：https://nigimitama.hatenablog.jp/entry/2023/03/13/073000
const copyImage = async () => {
        //const img = document.getElementById("img");
		const img =  document.querySelector('div img');
        const responsePromise = await fetch(img.src);
        const blob = responsePromise.blob();
        const data = [new ClipboardItem({ "image/png": blob })];

        navigator.clipboard.write(data).then(
          () => { console.log("success");dispMsg('QR Code successfully Copied', 3000); },
          (msg) => { console.log(`fail: `);dispMsg('QR Code copy failed', 3000); }
        );
      };

      //const button = document.getElementById("copyButton");
      //button.addEventListener("click", copyImage);

document.getElementById('btn_copy_QR').addEventListener('click',copyImage);


//-----URL copyボタンが押されたときの処理
document.getElementById('btn_copy_URL').addEventListener('click', function(e) {
	console.log('CopyURL button clicked!!');
	if (!navigator.clipboard) {
		dispMsg("[Copy URL] is not available on this bowser.", 3000);
		return;
	}
	const elURL = document.getElementById('URL');
	const txt = elURL.textContent;
	navigator.clipboard.writeText(txt).then( () => {
		dispMsg('URL successfully Copied', 3000);
	}
	, () => {
		dispMsg('Copy failure');
		dispMsg('URL copy failed.', 3000);
	}
	);
});

//テンポ表示のタイプ/B, /Nをクリックしたとき
document.getElementById('tempo_type').addEventListener('click', function(e) {
	//テンポ表示のタイプ(tempoType)を変更するのはADモードで
	//テンポのタイプをクリックしたときだけ。ここだけ
	tempoType = tempoType == 0? 1: 0;
	setTempo();
});

//1/3,1/4ライン表示チェックボックスがクリックされたとき
elChkLine.addEventListener('change', function(e){
	if(DEBUG) console.log(`◆Line checkbox clicked! ${isMoving?'動作中': '停止中'}`);
	if(!isMoving) setTheme();
});

window.addEventListener("load", (event) => {

	elTempoTxt.font = "20pt sans-serif";
	//  drawBall(xx0 + ( Beat - 1) * xpitch, cvMain.height - 0.5 * ball_height);
	setTimeout( () => {
		//1秒後にボールを置く
		drawBall(xx0 + (Beat - 1) * xpitch, cvMain.height - 0.5 * ball_height);
	}
	, 700);
	
}
);

//====↑イベントリスナー関連　ここまで =================

//-----《初期化コードの続き》---以後の関数は確認後に場所を移すこと
if(DEBUG){
		
	console.log(`この端末は${isPC? 'PC':'SmartPhone'}です。`);
	
	console.log(`初期コード終了後のパラメータ`);
	console.log(`Normal 【${s_beatStr[0]}】  Advanced 【${s_beatStr[1]}】　current【${beatStr}】
		isNormalBeat ${isNormalBeat} ${isNormalMode?'ノーマルモード':'ADモード'}`);
	
	//BPM = toBPM(MM);
	console.log(`MM = ${MM}  BPM = ${BPM}`);
	
	makeBeatArray(beatStr, motionType);
	console.log(`Normal 【${s_beatStr[0]}】  Advanced 【${s_beatStr[1]}】　current【${beatStr}】
		isNormalBeat ${isNormalBeat} ${isNormalMode?'ノーマルモード':'ADモード'}`);
	pushPara(isNormalBeat ? 0 : 1)
	
	console.log(`----
		Normal 【${s_beatStr[0]}】  Advanced 【${s_beatStr[1]}】　current【${beatStr}】
		isNormalBeat ${isNormalBeat} ${isNormalMode?'ノーマルモード':'ADモード'}`);
	
	
	//URLパラメータで、変拍子指定されている場合は、カラーテーマをＡＤモードで起動
	isNormalMode = isNormalBeat;
	//URLパラメータでクリックサウンドスクリプトが指定されていたら、clickType==9 ならADモード。
	if(clickType == 9) isNormalMode = false;
	//isNormalBeatでもAD設定として扱うことがあるのでmakeBeatArrayの外で設定する。
	if (isNormalMode) {
		setParaNSheet();
	} else {
		setParaADSheet();
	}
	console.log(`Normal 【${s_beatStr[0]}】  Advanced 【${s_beatStr[1]}】　current【${beatStr}】
		isNormalBeat ${isNormalBeat} ${isNormalMode?'ノーマルモード':'ADモード'}`);
	setTheme();
	
	console.log(`Normal 【${s_beatStr[0]}】  Advanced 【${s_beatStr[1]}】　current【${beatStr}】
		isNormalBeat ${isNormalBeat} ${isNormalMode?'ノーマルモード':'ADモード'}`);
	
	setTempo();
	
	//テンポに該当するインデクスを求める関数のテスト
	
	let vv0 = 56;
	let vv = getIndexOfAryMM(vv0);
	console.log(`入力値:${vv0} aryMM_idx:${vv}`);
	console.log(`aryMM[]=${aryMM[vv]}`);
	
	//クリックサウンドスクリプト関連テスト
	//clickType = 9;
	//ボレロの配列
	makeClickTimingArray('33', '1[111]_1[111]_11_/_1[111]_1[111]_[111111]');
	console.log(`aryMM[]=${aryCT}`);
	for(let i = 0; i < aryCT.length; i++){
		console.log(`${i}:${aryCT[i]}
		`);
	}
	//clickType = 9;
	//n連符処理のチェック
	makeClickTimingArray('1111', '10{8.01111111}1/1111');
	console.log(`aryMM[]=${aryCT}`);
	for(let i = 0; i < aryCT.length; i++){
		console.log(`${i}:${aryCT[i]}
		`);
	}
	
	//
	showCurrentParm('初期化すべて終了後のパラメータ');
	console.log(`■■■■正規表現置き換えのテスト クリックサウンドスクリプト用■■■■`);
	let test_str = '111 / (22121)0101 　/ [111]1101 / {5. 11111} ,?sdf あいも';
	console.log(`変換前■■■■${test_str}■■■■`);
	console.log(`変換後◆◆◆◆${test_str.replace(/[^0-9 \(\)\{\}\[\]\/\.\_]/g,'')}◆◆◆◆`);
	

}  //end of if(DEBUG)
showCurrentParm('初期化すべて終了後のパラメータ');

/******************* end of script ********************************/

<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
$path=parse_url($_SERVER['REQUEST_URI']??'',PHP_URL_PATH);
$routes=['/auth/login'=>'POST','/auth/logout'=>'POST','/auth/me'=>'GET','/auth/change-password'=>'POST','/api/dashboard'=>'GET','/api/analytics'=>'GET'];
$method=$_SERVER['REQUEST_METHOD']??'GET';
// Strict per-route method lists: a path matching one of these accepts only the listed methods.
$strictRoutes=[
 '#^/api/training$#D'=>['GET'],
 '#^/api/training/(?:progress|courses|lessons)$#D'=>['POST'],
 '#^/api/training/(?:me|team)$#D'=>['GET'],
 '#^/api/training/(?:records|reset|quiz-attempts)$#D'=>['POST'],
 '#^/api/training/settings$#D'=>['GET','PUT'],
 '#^/api/training/users/[1-9][0-9]{0,15}$#D'=>['GET'],
 '#^/api/feedback$#D'=>['GET','POST'],
 '#^/api/feedback/stats$#D'=>['GET'],
 '#^/api/feedback/[1-9][0-9]{0,15}$#D'=>['GET','PATCH'],
 '#^/api/feedback/[1-9][0-9]{0,15}/attachments$#D'=>['POST'],
 '#^/api/feedback/[1-9][0-9]{0,15}/comments$#D'=>['POST'],
 '#^/api/feedback/attachments/[1-9][0-9]{0,15}$#D'=>['GET'],
 '#^/api/admin/users$#D'=>['GET','POST'],
 '#^/api/admin/users/[1-9][0-9]{0,15}$#D'=>['PATCH','DELETE'],
 '#^/api/admin/users/[1-9][0-9]{0,15}/reset-password$#D'=>['POST'],
];
$strictMethods=null;
foreach($strictRoutes as $pattern=>$methods){if(preg_match($pattern,(string)$path)===1){$strictMethods=$methods;break;}}
$pathMatchesTraining=$strictMethods!==null&&strncmp((string)$path,'/api/training',13)===0;
$pathMatchesFeedback=$strictMethods!==null&&strncmp((string)$path,'/api/feedback',13)===0;
$pathMatchesApi=preg_match('#^/api/work-items(?:/[1-9][0-9]*)?$#D',(string)$path)===1||$pathMatchesTraining||$pathMatchesFeedback;
$pathMatchesAdminUsers=$strictMethods!==null&&strncmp((string)$path,'/api/admin/users',16)===0;
$pathMatchesCommunication=preg_match('#^/api/communication(?:/(?:overview|audit|conversations|tasks)|/conversations/[1-9][0-9]*(?:/(?:messages|read))?|/tasks/[1-9][0-9]*)$#',(string)$path)===1;
$pathMatchesState=$path==='/api/erp/state';
$pathMatchesDashboardLayout=$path==='/api/dashboard-layout';
if($pathMatchesState)$routes[$path]=$_SERVER['REQUEST_METHOD']??'GET';
if($pathMatchesDashboardLayout)$routes[$path]=$_SERVER['REQUEST_METHOD']??'GET';
if($pathMatchesApi&&!$pathMatchesTraining)$routes[$path]=$method;
if($strictMethods!==null)$routes[$path]=in_array($method,$strictMethods,true)?$method:$strictMethods[0];
if($pathMatchesCommunication)$routes[$path]=$_SERVER['REQUEST_METHOD']??'GET';
if(!isset($routes[$path])){http_response_code(404);echo json_encode(['error'=>'Not found']);exit;}
if(($_SERVER['REQUEST_METHOD']??'')!==$routes[$path]){http_response_code(405);echo json_encode(['error'=>'Method not allowed']);exit;}
if(empty($_SERVER['HTTPS'])||$_SERVER['HTTPS']==='off'){http_response_code(403);echo json_encode(['error'=>'HTTPS required']);exit;}
$headers=['Accept: application/json'];
if($path==='/auth/login'||$path==='/auth/change-password'||$pathMatchesApi||$pathMatchesState||$pathMatchesAdminUsers||$pathMatchesDashboardLayout||$pathMatchesCommunication){$headers[]='Content-Type: application/json';}
if($path!=='/auth/login'){
 $incoming=function_exists('getallheaders')?getallheaders():[];
 $auth=$_SERVER['HTTP_AUTHORIZATION']??$_SERVER['REDIRECT_HTTP_AUTHORIZATION']??($incoming['Authorization']??$incoming['authorization']??'');
 if(!preg_match('/^Bearer [a-f0-9]{64}$/D',$auth)){http_response_code(401);echo json_encode(['error'=>'Unauthorized']);exit;}
 $headers[]='Authorization: '.$auth;
}
$body='';
if($path==='/auth/login'||$path==='/auth/change-password'||$pathMatchesApi||$pathMatchesState||$pathMatchesAdminUsers||$pathMatchesDashboardLayout||$pathMatchesCommunication){
 $bodyLimit=$pathMatchesFeedback?18000000:($pathMatchesState?12000000:4096);
 $body=file_get_contents('php://input',false,null,0,$bodyLimit+1);
 if(strlen($body)>$bodyLimit){http_response_code(413);echo json_encode(['error'=>'Request too large']);exit;}
}
$ch=curl_init('http://127.0.0.1:3107'.$path);
curl_setopt_array($ch,[CURLOPT_CUSTOMREQUEST=>$routes[$path],CURLOPT_HTTPHEADER=>$headers,CURLOPT_POSTFIELDS=>in_array($routes[$path],['POST','PUT','PATCH'],true)?$body:null,CURLOPT_RETURNTRANSFER=>true,CURLOPT_CONNECTTIMEOUT=>2,CURLOPT_TIMEOUT=>10,CURLOPT_FOLLOWLOCATION=>false]);
$result=curl_exec($ch);$status=curl_getinfo($ch,CURLINFO_HTTP_CODE);curl_close($ch);
if($result===false||$status<100||$status>599){http_response_code(502);echo json_encode(['error'=>'ERP API unavailable']);exit;}
http_response_code($status);
if(stripos($_SERVER['HTTP_ACCEPT_ENCODING']??'','gzip')!==false&&strlen($result)>1024){
 $compressed=gzencode($result,6);
 if($compressed!==false&&strlen($compressed)<strlen($result)){header('Content-Encoding: gzip');header('Vary: Accept-Encoding');$result=$compressed;}
}
echo $result;

<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
$path=parse_url($_SERVER['REQUEST_URI']??'',PHP_URL_PATH);
$routes=['/auth/login'=>'POST','/auth/logout'=>'POST','/auth/me'=>'GET','/auth/change-password'=>'POST','/api/dashboard'=>'GET','/api/analytics'=>'GET'];
$pathMatchesApi=preg_match('#^/api/(?:work-items(?:/[1-9][0-9]*)?|training(?:/(?:progress|courses|lessons))?)$#',(string)$path)===1;
$pathMatchesAdminUsers=preg_match('#^/api/admin/users(?:/[1-9][0-9]*(?:/reset-password)?)?$#',(string)$path)===1;
$pathMatchesCommunication=preg_match('#^/api/communication(?:/(?:overview|audit|conversations|tasks)|/conversations/[1-9][0-9]*(?:/(?:messages|read))?|/tasks/[1-9][0-9]*)$#',(string)$path)===1;
$pathMatchesState=$path==='/api/erp/state';
$pathMatchesDashboardLayout=$path==='/api/dashboard-layout';
if($pathMatchesState)$routes[$path]=$_SERVER['REQUEST_METHOD']??'GET';
if($pathMatchesDashboardLayout)$routes[$path]=$_SERVER['REQUEST_METHOD']??'GET';
if($pathMatchesApi)$routes[$path]=$_SERVER['REQUEST_METHOD']??'GET';
if($pathMatchesAdminUsers)$routes[$path]=$_SERVER['REQUEST_METHOD']??'GET';
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
 $body=file_get_contents('php://input',false,null,0,$pathMatchesState?12000000:4097);
 if(strlen($body)>($pathMatchesState?12000000:4096)){http_response_code(413);echo json_encode(['error'=>'Request too large']);exit;}
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
